const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Domain = require("./models/Domain");

dotenv.config();

const domains = [
  { name: "React.js", description: "React.js frontend development, components, hooks and application architecture." },
  { name: "HTML & CSS", description: "HTML5, CSS3, responsive layouts, accessibility and modern web UI." },
  { name: "Java", description: "Core Java, OOP, collections, exceptions, multithreading and problem solving." },
  { name: "JavaScript", description: "Modern JavaScript, ES6+, asynchronous programming, DOM and web APIs." },
  { name: "Python", description: "Python programming, data structures, OOP, modules and practical problem solving." },
  { name: "DevOps", description: "DevOps fundamentals, automation, deployment, monitoring and engineering practices." },
  { name: "Data Analytics", description: "Data analysis concepts, SQL, reporting, visualization and practical analytics." },
  { name: "Kubernetes", description: "Containers, Kubernetes architecture, workloads, networking, storage and operations." },
  { name: "Jenkins", description: "Jenkins pipelines, jobs, agents, automation and CI/CD practices." },
  { name: "CI/CD Pipeline", description: "Continuous integration, delivery, deployment strategies and pipeline automation." },
  { name: "Power BI", description: "Power BI dashboards, data modeling, DAX, Power Query and reporting." },
  { name: "MS SQL", description: "Microsoft SQL Server, queries, joins, indexing, procedures and database concepts." },
  { name: "Kotlin", description: "Kotlin language fundamentals, OOP, collections, null safety and application development." },
  { name: "Flutter", description: "Flutter and Dart, widgets, state management, layouts and mobile application development." },
  { name: "React Native", description: "React Native components, navigation, state management and cross-platform mobile development." },
  { name: "Apache", description: "Apache HTTP Server, configuration, virtual hosts, modules, security and deployment." },
];

async function seedDomains() {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from environment variables");

    await mongoose.connect(process.env.MONGO_URI);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    let added = 0;
    let existing = 0;

    for (const domain of domains) {
      const result = await Domain.updateOne(
        { name: { $regex: `^${domain.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        { $setOnInsert: { ...domain, durationMinutes: 30, totalQuestions: 0, questionsPerExam: 6, mcqQuestionsPerExam: 4, codingQuestionsPerExam: 2, isActive: true } },
        { upsert: true }
      );

      if (result.upsertedCount) {
        added += 1;
        console.log(`Added: ${domain.name}`);
      } else {
        existing += 1;
        console.log(`Already exists: ${domain.name}`);
      }
    }

    console.log(`\nCompleted. Added ${added} domains; kept ${existing} existing domains unchanged.`);
  } catch (error) {
    console.error("Domain seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDomains();
