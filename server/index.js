require("dotenv").config();

const { app } = require("./app");

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`getInnr site → http://localhost:${PORT}`);
  console.log(`Back-office → http://localhost:${PORT}/admin.html`);
});
