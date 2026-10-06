console.log("Making fetch request...");
fetch("http://localhost:3000/api/generate", {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({theme: "teste"})
}).then(res => res.json())
  .then(data => console.log("Success:", JSON.stringify(data).substring(0, 100)))
  .catch(err => console.error("Error:", err));
