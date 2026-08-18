const Domain = require("../models/Domain");

// Screen 3: Domain list (DevOps, DA, React, HTML&CSS, Java, Python, ...)
const getDomains = async (req, res) => {
  try {
    const domains = await Domain.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ success: true, count: domains.length, domains });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Screen 4: Domain detail (shows duration/timer before starting the exam)
const getDomainById = async (req, res) => {
  try {
    const domain = await Domain.findById(req.params.id);
    if (!domain) {
      return res.status(404).json({ success: false, message: "Domain not found" });
    }
    return res.status(200).json({ success: true, domain });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createDomain = async (req, res) => {
  try {
    const domain = await Domain.create(req.body);
    return res.status(201).json({ success: true, domain });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDomains, getDomainById, createDomain };
