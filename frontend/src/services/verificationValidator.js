/**
 * Client-side preflight checks for the live identity photo.
 *
 * These checks intentionally do NOT claim to prove that an ID is genuine.
 * They only reject obviously unusable captures before the assessment starts.
 */

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The captured image could not be read."));
    image.src = dataUrl;
  });
}

function imageMetrics(image) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const sampleWidth = Math.min(320, width);
  const sampleHeight = Math.max(1, Math.round((height / width) * sampleWidth));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);

  let brightness = 0;
  let variance = 0;
  const gray = new Float32Array(sampleWidth * sampleHeight);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = value;
    brightness += value;
  }
  brightness /= gray.length;
  for (const value of gray) variance += (value - brightness) ** 2;
  variance /= gray.length;

  let edgeEnergy = 0;
  let laplacianEnergy = 0;
  for (let y = 1; y < sampleHeight; y += 1) {
    for (let x = 1; x < sampleWidth; x += 1) {
      const current = gray[y * sampleWidth + x];
      const left = gray[y * sampleWidth + x - 1];
      const top = gray[(y - 1) * sampleWidth + x];
      edgeEnergy += Math.abs(current - left) + Math.abs(current - top);
    }
  }
  edgeEnergy /= Math.max(1, (sampleWidth - 1) * (sampleHeight - 1) * 2);

  // Use a normalized Laplacian-variance style sharpness metric.
  // The previous edgeEnergy threshold was too strict for normal webcam
  // frames and incorrectly rejected clear photos as blurry.
  if (sampleWidth >= 3 && sampleHeight >= 3) {
    let lapSum = 0;
    let lapSqSum = 0;
    let lapCount = 0;
    for (let y = 1; y < sampleHeight - 1; y += 1) {
      for (let x = 1; x < sampleWidth - 1; x += 1) {
        const center = gray[y * sampleWidth + x];
        const lap =
          gray[(y - 1) * sampleWidth + x] +
          gray[(y + 1) * sampleWidth + x] +
          gray[y * sampleWidth + (x - 1)] +
          gray[y * sampleWidth + (x + 1)] -
          4 * center;
        lapSum += lap;
        lapSqSum += lap * lap;
        lapCount += 1;
      }
    }
    const lapMean = lapSum / Math.max(1, lapCount);
    laplacianEnergy =
      lapSqSum / Math.max(1, lapCount) - lapMean * lapMean;
  }

  return {
    width,
    height,
    brightness,
    variance,
    edgeEnergy,
    laplacianEnergy,
  };
}

async function detectFace(image) {
  if (typeof window.FaceDetector !== "function") {
    return { supported: false, count: null };
  }

  try {
    const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(image);
    return { supported: true, count: faces.length, faces };
  } catch {
    return { supported: false, count: null };
  }
}

export async function validateIdentityCapture(dataUrl) {
  const errors = [];
  const warnings = [];

  if (!dataUrl) {
    return { valid: false, errors: ["Capture a live photo before continuing."], warnings };
  }

  const image = await loadImage(dataUrl);
  const metrics = imageMetrics(image);

  if (metrics.width < 640 || metrics.height < 360) {
    errors.push("The camera image is too small. Use a higher-resolution camera.");
  }

  if (metrics.brightness < 45) {
    errors.push("The image is too dark. Move to a well-lit area.");
  } else if (metrics.brightness > 225) {
    errors.push("The image is overexposed. Avoid strong light directly behind or in front of you.");
  }

  if (metrics.variance < 280) {
    errors.push("The image has very little detail. Make sure your camera lens is clear and the scene is in focus.");
  }

  // Do not use the old edgeEnergy < 7 rule here. Normal webcam photos
  // can legitimately score below 7 even when they are sharp.
  // A low Laplacian variance is a much better blur signal.
  if (metrics.laplacianEnergy < 90 && metrics.edgeEnergy < 2.0) {
    errors.push("The image appears too soft or blurry. Hold the camera steady and retake the photo.");
  }

  const face = await detectFace(image);
  if (face.supported) {
    if (face.count === 0) {
      errors.push("No face was detected. Make sure your full face is visible.");
    } else if (face.count > 1) {
      errors.push("More than one face was detected. Only the candidate should be visible.");
    } else {
      const box = face.faces[0].boundingBox;
      const faceAreaRatio = (box.width * box.height) / (metrics.width * metrics.height);
      if (faceAreaRatio < 0.035) {
        errors.push("Your face is too far from the camera. Move closer while keeping the ID visible.");
      }
    }
  } else {
    warnings.push("Automatic face detection is not available in this browser. The capture will still be checked for image quality.");
  }

  // A combined face + physical-ID capture cannot be reliably authenticated in-browser
  // without a document/identity verification engine. Do not pretend that a checkbox or
  // simple rectangle heuristic proves an ID is present. The UI therefore uses a strict
  // camera-only flow and exposes this as a preflight check for the admin review.
  warnings.push("The photo must visibly show your face and the physical government ID you are holding. Final document authenticity is reviewed separately.");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics,
    faceDetected: face.supported ? face.count === 1 : null,
  };
}
