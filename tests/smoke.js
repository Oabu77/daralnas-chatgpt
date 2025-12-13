import http from "http";
const url = `http://127.0.0.1:${process.env.PORT || 3333}/health`;
http
  .get(url, (res) => {
    console.log("GET /health status:", res.statusCode);
    if (res.statusCode !== 200) process.exitCode = 1;
    res.resume();
  })
  .on("error", (err) => {
    console.error("Smoke test failed:", err.message);
    process.exitCode = 1;
  });
