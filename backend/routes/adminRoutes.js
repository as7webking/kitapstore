router.post(
  "/create-admin",
  verifyToken,
  verifyAdmin,
  createAdmin
);
