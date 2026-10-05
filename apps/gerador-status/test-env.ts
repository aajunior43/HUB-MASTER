for (const key of Object.keys(process.env)) {
  if (key.includes("API") || key.includes("GEMINI")) {
    console.log(key, process.env[key] ? process.env[key].length : 0);
  }
}
