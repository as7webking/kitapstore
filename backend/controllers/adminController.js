// Admin creates another admin
export const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  const admin = await User.create({
    name,
    email,
    password,
    role: "admin",
  });

  res.status(201).json({ success: true });
};
