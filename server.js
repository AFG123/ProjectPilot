const app = require('./src/app');

// Railway (and most hosts) inject the port to bind via process.env.PORT.
// Fall back to 3000 for local dev.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

