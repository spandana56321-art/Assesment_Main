const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Domain = require("./models/Domain");
const Question = require("./models/Question");

/*
 * Safe default question seed.
 * - Adds missing default questions only.
 * - Never deletes existing questions.
 * - Keeps every domain at 4 MCQs + 2 coding questions minimum.
 * - Coding questions use the current application's JavaScript solve(a, b)
 *   runner so they work with the existing frontend CodeRunner.
 */

const DEFAULTS = {
  "React.js": {
    mcq: [
      ["Which hook is used to manage local state in a React function component?", "useState", "useEffect", "useMemo", "useRef", "A"],
      ["Which prop is used to render a list with a stable identity?", "className", "key", "id", "name", "B"],
      ["What does useEffect primarily handle?", "Rendering JSX", "Side effects", "Creating CSS", "Declaring props", "B"],
      ["Which method is commonly used to render a React application into the DOM in modern React?", "createRoot", "createClass", "renderHTML", "mountNode", "A"]
    ],
    coding: [
      ["React logic: create a pure helper that returns the sum of two numeric values.", "javascript", "function solve(a, b) {\n  // Return a + b\n}", [["2 3","5"],["10 7","17"],["0 4","4"],["-2 5","3"],["8 8","16"]]],
      ["React data handling: return the larger of two values.", "javascript", "function solve(a, b) {\n  // Return the larger value\n}", [["2 3","3"],["10 7","10"],["0 -1","0"],["-5 -2","-2"],["8 8","8"]]]
    ]
  },
  "HTML & CSS": {
    mcq: [
      ["Which HTML element is intended for the main content of a page?", "<main>", "<section>", "<div>", "<content>", "A"],
      ["Which CSS property changes the space inside an element's border?", "margin", "padding", "gap", "spacing", "B"],
      ["Which selector targets an element with a specific id?", ".id", "#id", "*id", "@id", "B"],
      ["Which CSS layout system is designed for one-dimensional layouts?", "Flexbox", "Grid", "Float", "Table", "A"]
    ],
    coding: [
      ["Frontend logic: return the total width when content width and horizontal padding are supplied.", "javascript", "function solve(a, b) {\n  // Return content width + both sides of padding\n}", [["100 10","120"],["80 5","90"],["0 12","24"],["50 0","50"],["120 20","160"]]],
      ["Frontend logic: return the larger of two responsive breakpoint values.", "javascript", "function solve(a, b) {\n  // Return the larger breakpoint\n}", [["768 1024","1024"],["480 768","768"],["1200 992","1200"],["320 375","375"],["1440 1366","1440"]]]
    ]
  },
  "Java": {
    mcq: [
      ["Which keyword is used to inherit from a class in Java?", "implements", "extends", "inherits", "super", "B"],
      ["Which collection does not allow duplicate elements?", "List", "Set", "Map", "ArrayList", "B"],
      ["Which method is the usual entry point of a Java application?", "start()", "run()", "main()", "init()", "C"],
      ["Which keyword prevents a class from being inherited?", "static", "private", "final", "sealed", "C"]
    ],
    coding: [
      ["Java concept: return the sum of two integers.", "javascript", "function solve(a, b) {\n  // Implement the calculation\n}", [["4 6","10"],["12 8","20"],["0 9","9"],["-3 7","4"],["15 5","20"]]],
      ["Java concept: return the absolute difference between two integers.", "javascript", "function solve(a, b) {\n  // Return |a - b|\n}", [["10 6","4"],["3 9","6"],["0 5","5"],["-2 4","6"],["8 8","0"]]]
    ]
  },
  "JavaScript": {
    mcq: [
      ["Which declaration creates a block-scoped variable that can be reassigned?", "var", "let", "const", "static", "B"],
      ["What does === compare?", "Only type", "Only value", "Value and type", "References only", "C"],
      ["Which array method creates a new array by transforming each element?", "filter", "map", "reduce", "find", "B"],
      ["Which feature allows a function to remember variables from its outer scope?", "Closure", "Hoisting", "Prototype", "Destructuring", "A"]
    ],
    coding: [
      ["JavaScript basics: return the sum of two numbers.", "javascript", "function solve(a, b) {\n  // Return the sum\n}", [["2 5","7"],["10 20","30"],["-4 9","5"],["0 0","0"],["7 8","15"]]],
      ["JavaScript basics: return the product of two numbers.", "javascript", "function solve(a, b) {\n  // Return the product\n}", [["2 5","10"],["10 3","30"],["-4 2","-8"],["0 8","0"],["7 7","49"]]]
    ]
  },
  "Python": {
    mcq: [
      ["Which Python type stores key-value pairs?", "list", "tuple", "dict", "set", "C"],
      ["Which keyword defines a function?", "func", "def", "function", "lambda", "B"],
      ["Which operator performs exponentiation in Python?", "^", "**", "//", "%%", "B"],
      ["Which data structure is ordered and mutable?", "tuple", "list", "set", "frozenset", "B"]
    ],
    coding: [
      ["Python basics: return the sum of two numbers.", "javascript", "function solve(a, b) {\n  // Return the sum\n}", [["1 2","3"],["10 5","15"],["-2 8","6"],["0 7","7"],["9 9","18"]]],
      ["Python basics: return the larger of two numbers.", "javascript", "function solve(a, b) {\n  // Return the maximum\n}", [["1 2","2"],["10 5","10"],["-2 -8","-2"],["0 -1","0"],["9 9","9"]]]
    ]
  },
  "DevOps": {
    mcq: [
      ["What is a primary goal of DevOps?", "Separate development and operations", "Improve collaboration and delivery", "Avoid automation", "Remove testing", "B"],
      ["Which practice automates building and testing changes?", "CI", "DNS", "CRUD", "FTP", "A"],
      ["What does infrastructure as code mean?", "Manual server setup", "Managing infrastructure with code", "Writing only UI code", "Replacing databases", "B"],
      ["Which metric commonly measures deployment frequency?", "DORA metric", "CSS metric", "DOM metric", "SQL metric", "A"]
    ],
    coding: [
      ["DevOps automation logic: return the number of successful deployments from total deployments and failed deployments.", "javascript", "function solve(a, b) {\n  // a = total, b = failed\n  // Return successful deployments\n}", [["10 2","8"],["20 5","15"],["5 0","5"],["12 7","5"],["100 20","80"]]],
      ["DevOps monitoring logic: return the average of two response-time measurements.", "javascript", "function solve(a, b) {\n  // Return the average\n}", [["10 20","15"],["100 50","75"],["0 20","10"],["30 30","30"],["5 15","10"]]]
    ]
  },
  "Data Analytics": {
    mcq: [
      ["Which measure represents the middle value of an ordered dataset?", "Mean", "Median", "Mode", "Range", "B"],
      ["What is a KPI?", "Key Performance Indicator", "Key Processing Input", "Known Program Interface", "Kernel Performance Index", "A"],
      ["Which chart is useful for showing a trend over time?", "Line chart", "Pie chart", "Gauge only", "Tree map only", "A"],
      ["What does ETL stand for?", "Extract Transform Load", "Evaluate Test Learn", "Encode Transfer Link", "Extract Type List", "A"]
    ],
    coding: [
      ["Analytics logic: calculate the average of two numeric observations.", "javascript", "function solve(a, b) {\n  // Return the average\n}", [["10 20","15"],["4 8","6"],["0 10","5"],["30 50","40"],["2 6","4"]]],
      ["Analytics logic: calculate the percentage represented by a value out of a total.", "javascript", "function solve(a, b) {\n  // a = value, b = total\n  // Return percentage\n}", [["25 100","25"],["50 200","25"],["10 20","50"],["5 100","5"],["75 150","50"]]]
    ]
  },
  "Kubernetes": {
    mcq: [
      ["What is the smallest deployable unit in Kubernetes?", "Pod", "Node", "Cluster", "Service", "A"],
      ["Which object exposes an application inside or outside a cluster?", "ConfigMap", "Service", "Secret", "Volume", "B"],
      ["Which component schedules Pods onto nodes?", "kubelet", "kube-scheduler", "kubectl", "CoreDNS", "B"],
      ["Which command-line tool is commonly used to interact with Kubernetes?", "docker", "kubectl", "npm", "helmfile", "B"]
    ],
    coding: [
      ["Kubernetes scaling logic: return the number of additional replicas needed to reach the desired count.", "javascript", "function solve(a, b) {\n  // a = desired replicas, b = current replicas\n}", [["5 3","2"],["10 7","3"],["3 3","0"],["8 2","6"],["1 0","1"]]],
      ["Kubernetes capacity logic: return total available capacity from two node pools.", "javascript", "function solve(a, b) {\n  // Return combined capacity\n}", [["4 6","10"],["10 5","15"],["0 8","8"],["7 3","10"],["12 8","20"]]]
    ]
  },
  "Jenkins": {
    mcq: [
      ["Jenkins is primarily used for what?", "CI/CD automation", "Image editing", "Database hosting", "DNS management", "A"],
      ["What is a Jenkins Pipeline?", "A delivery workflow as code", "A database table", "A CSS framework", "A browser", "A"],
      ["Which file commonly defines a Jenkins Pipeline?", "Jenkinsfile", "Dockerfile only", "package.json only", "index.html", "A"],
      ["What can trigger a Jenkins job?", "Source control changes", "Only manual typing", "Only database updates", "Only browser refresh", "A"]
    ],
    coding: [
      ["Jenkins pipeline metric: return successful builds from total builds minus failed builds.", "javascript", "function solve(a, b) {\n  // a = total builds, b = failed builds\n}", [["10 2","8"],["20 4","16"],["5 1","4"],["7 7","0"],["100 15","85"]]],
      ["Jenkins automation logic: return the total of two build durations.", "javascript", "function solve(a, b) {\n  // Return combined duration\n}", [["10 20","30"],["5 15","20"],["0 30","30"],["40 10","50"],["7 8","15"]]]
    ]
  },
  "CI/CD Pipeline": {
    mcq: [
      ["What does CI stand for?", "Continuous Integration", "Central Interface", "Code Inspection", "Continuous Input", "A"],
      ["What is CD commonly associated with?", "Continuous Delivery/Deployment", "Code Design", "Central Database", "Component Definition", "A"],
      ["Which stage normally runs automated tests?", "Test", "Design", "DNS", "Release notes only", "A"],
      ["What is a pipeline artifact?", "A file/output produced by a pipeline", "A user account", "A network cable", "A browser tab", "A"]
    ],
    coding: [
      ["Pipeline logic: return successful stages when total stages and failed stages are given.", "javascript", "function solve(a, b) {\n  // a = total, b = failed\n}", [["6 2","4"],["10 3","7"],["4 0","4"],["8 8","0"],["20 5","15"]]],
      ["Pipeline logic: calculate total deployment minutes from two stage durations.", "javascript", "function solve(a, b) {\n  // Return total duration\n}", [["5 10","15"],["20 30","50"],["0 8","8"],["12 18","30"],["7 7","14"]]]
    ]
  },
  "Power BI": {
    mcq: [
      ["Power BI is primarily used for what?", "Business intelligence and visualization", "Operating systems", "Source control", "Web hosting", "A"],
      ["Which language is commonly used for Power BI measures?", "DAX", "HTML", "Bash", "Java", "A"],
      ["What is a slicer used for?", "Interactive filtering", "Writing Java code", "Managing DNS", "Creating containers", "A"],
      ["Which view is used to build relationships between tables?", "Model view", "Reading view", "Terminal view", "Pipeline view", "A"]
    ],
    coding: [
      ["Power BI-style measure logic: return the total of two numeric values.", "javascript", "function solve(a, b) {\n  // Return total\n}", [["100 50","150"],["10 25","35"],["0 20","20"],["75 25","100"],["200 300","500"]]],
      ["Power BI-style KPI logic: return the difference between target and actual values.", "javascript", "function solve(a, b) {\n  // a = target, b = actual\n  // Return target - actual\n}", [["100 80","20"],["50 40","10"],["200 250","-50"],["10 10","0"],["75 60","15"]]]
    ]
  },
  "MS SQL": {
    mcq: [
      ["Which SQL command retrieves rows from a table?", "SELECT", "PUSH", "FETCHALL", "READTABLE", "A"],
      ["Which clause filters rows?", "WHERE", "ORDER", "GROUP", "FILTERBY", "A"],
      ["Which keyword removes duplicate rows from a SELECT result?", "UNIQUE", "DISTINCT", "DEDUP", "ONLY", "B"],
      ["Which join returns matching rows from both tables?", "INNER JOIN", "LEFT JOIN", "CROSS JOIN", "FULL TEXT", "A"]
    ],
    coding: [
      ["SQL logic: return the total of two numeric values, representing two aggregated query results.", "javascript", "function solve(a, b) {\n  // Return combined total\n}", [["10 20","30"],["100 50","150"],["0 8","8"],["7 3","10"],["25 75","100"]]],
      ["SQL logic: return the larger row count from two result sets.", "javascript", "function solve(a, b) {\n  // Return the larger count\n}", [["10 20","20"],["50 30","50"],["0 8","8"],["7 7","7"],["100 80","100"]]]
    ]
  },
  "Kotlin": {
    mcq: [
      ["Which keyword declares a read-only variable in Kotlin?", "let", "val", "const", "readonly", "B"],
      ["Which keyword declares a mutable variable?", "var", "mut", "change", "dynamic", "A"],
      ["Which feature helps Kotlin handle nullable values safely?", "Null-safety", "Pointers", "Macros", "Preprocessors", "A"],
      ["Which function is commonly the entry point of a Kotlin application?", "start", "main", "initApp", "runApp", "B"]
    ],
    coding: [
      ["Kotlin logic: return the sum of two integers.", "javascript", "function solve(a, b) {\n  // Return the sum\n}", [["2 4","6"],["10 15","25"],["-3 5","2"],["0 9","9"],["8 2","10"]]],
      ["Kotlin logic: return the absolute difference of two integers.", "javascript", "function solve(a, b) {\n  // Return absolute difference\n}", [["10 4","6"],["3 8","5"],["0 7","7"],["-2 5","7"],["9 9","0"]]]
    ]
  },
  "Flutter": {
    mcq: [
      ["Flutter applications are primarily written in which language?", "Dart", "Kotlin", "Swift", "JavaScript", "A"],
      ["What is a Flutter widget?", "A UI building block", "A database table", "A server process", "A package manager", "A"],
      ["Which widget is commonly used for a vertically scrollable list?", "ListView", "ColumnOnly", "ScrollBox", "VerticalPanel", "A"],
      ["Which command starts a Flutter development application?", "flutter run", "flutter start-server", "dart web-start", "flutter boot", "A"]
    ],
    coding: [
      ["Flutter/Dart logic: return the sum of two numeric values.", "javascript", "function solve(a, b) {\n  // Return the sum\n}", [["1 2","3"],["10 20","30"],["-2 6","4"],["0 5","5"],["9 4","13"]]],
      ["Flutter UI logic: return the total number of items when two lists have the given lengths.", "javascript", "function solve(a, b) {\n  // Return combined item count\n}", [["3 4","7"],["10 5","15"],["0 8","8"],["6 6","12"],["12 8","20"]]]
    ]
  },
  "React Native": {
    mcq: [
      ["React Native is primarily used to build what?", "Cross-platform mobile applications", "Databases", "Operating systems", "CI servers", "A"],
      ["Which language is commonly used with React Native?", "JavaScript/TypeScript", "SQL only", "Bash only", "DAX only", "A"],
      ["Which core component displays text in React Native?", "Text", "Label", "Typography", "Span", "A"],
      ["Which core component is commonly used for a basic container?", "View", "Container", "Box", "Panel", "A"]
    ],
    coding: [
      ["React Native logic: return the sum of two values used by a component calculation.", "javascript", "function solve(a, b) {\n  // Return the sum\n}", [["2 3","5"],["10 5","15"],["-1 4","3"],["0 9","9"],["7 8","15"]]],
      ["React Native logic: return the larger of two values.", "javascript", "function solve(a, b) {\n  // Return the maximum\n}", [["2 3","3"],["10 5","10"],["-1 -4","-1"],["0 9","9"],["7 7","7"]]]
    ]
  },
  "Apache": {
    mcq: [
      ["Apache HTTP Server is primarily used for what?", "Serving web content", "Compiling Java", "Building mobile apps", "Managing Kubernetes pods", "A"],
      ["Which protocol is commonly served by Apache HTTP Server?", "HTTP/HTTPS", "SMTP only", "SSH only", "FTP control only", "A"],
      ["What is a virtual host used for?", "Hosting multiple sites on one server", "Creating a database", "Compiling CSS", "Running a mobile emulator", "A"],
      ["Which file commonly contains Apache virtual host configuration on many Linux distributions?", "A site configuration file", "package.json", "pom.xml", "pubspec.yaml", "A"]
    ],
    coding: [
      ["Web server capacity logic: return the total number of requests handled by two workers.", "javascript", "function solve(a, b) {\n  // Return combined requests\n}", [["100 50","150"],["10 20","30"],["0 80","80"],["75 25","100"],["200 300","500"]]],
      ["Web server monitoring logic: return remaining requests after failed requests are removed from total requests.", "javascript", "function solve(a, b) {\n  // a = total, b = failed\n}", [["100 5","95"],["50 10","40"],["20 0","20"],["75 25","50"],["10 10","0"]]]
    ]
  }
};

function buildMcq(domainId, item) {
  const [questionText, optionA, optionB, optionC, optionD, correctOption] = item;
  return {
    domain: domainId,
    questionType: "mcq",
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctOption,
    marks: 1,
  };
}

function buildCoding(domainId, item) {
  const [questionText, language, starterCode, rawTests] = item;
  return {
    domain: domainId,
    questionType: "coding",
    questionText,
    language,
    starterCode,
    marks: 2,
    testCases: rawTests.map(([input, expectedOutput], index) => ({
      input,
      expectedOutput,
      isHidden: index >= 3,
    })),
  };
}

async function seedDefaultQuestions() {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to database: ${connection.connection.name}`);

    let added = 0;

    for (const [domainName, defaults] of Object.entries(DEFAULTS)) {
      const domain = await Domain.findOne({ name: domainName });

      if (!domain) {
        console.log(`Skipped: ${domainName} (domain not found)`);
        continue;
      }

      const mcqCount = await Question.countDocuments({
        domain: domain._id,
        questionType: "mcq",
      });
      const codingCount = await Question.countDocuments({
        domain: domain._id,
        questionType: "coding",
      });

      const neededMcq = Math.max(0, 4 - mcqCount);
      const neededCoding = Math.max(0, 2 - codingCount);

      if (neededMcq > 0) {
        const existingTexts = new Set(
          (await Question.find({ domain: domain._id, questionType: "mcq" }).select("questionText -_id"))
            .map((q) => q.questionText.trim().toLowerCase())
        );

        let seededMcq = 0;
        for (const item of defaults.mcq) {
          if (existingTexts.has(item[0].trim().toLowerCase())) continue;
          if (seededMcq >= neededMcq) break;
          await Question.create(buildMcq(domain._id, item));
          existingTexts.add(item[0].trim().toLowerCase());
          added += 1;
          seededMcq += 1;
        }
      }

      if (neededCoding > 0) {
        const existingTexts = new Set(
          (await Question.find({ domain: domain._id, questionType: "coding" }).select("questionText -_id"))
            .map((q) => q.questionText.trim().toLowerCase())
        );

        let seededCoding = 0;
        for (const item of defaults.coding) {
          if (existingTexts.has(item[0].trim().toLowerCase())) continue;
          if (seededCoding >= neededCoding) break;
          await Question.create(buildCoding(domain._id, item));
          existingTexts.add(item[0].trim().toLowerCase());
          added += 1;
          seededCoding += 1;
        }
      }

      // The exam flow expects 4 MCQ + 2 coding = 6 questions per assessment.
      await Domain.updateOne(
        { _id: domain._id },
        {
          $set: {
            mcqQuestionsPerExam: 4,
            codingQuestionsPerExam: 2,
            questionsPerExam: 6,
          },
        }
      );

      const finalMcq = await Question.countDocuments({ domain: domain._id, questionType: "mcq" });
      const finalCoding = await Question.countDocuments({ domain: domain._id, questionType: "coding" });
      console.log(`${domainName}: ${finalMcq} MCQ, ${finalCoding} coding`);
    }

    console.log(`\nCompleted. Added ${added} default questions.`);
    console.log("Existing questions were preserved.");
  } catch (error) {
    console.error("Default question seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDefaultQuestions();
