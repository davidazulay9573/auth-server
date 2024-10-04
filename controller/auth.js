const { User } = require("../model/users");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const signup = async (req, res) => {
  try {
    console.log(req.body);
    const { name, email, password } = req.body;


    if (!name || !email || !password) {
      return res.status(400).send({ message: "Bad request" });
    }

    if (await User.findOne({ email })) {
      return res.status(409).send({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      ...req.body,
      password: hashedPassword,
      status: "pending",
    });
    await user.save();

    const verificationCode = Math.floor(100000 + Math.random() * 900000); 
    sendEmailCode({ ...req.body, id: user._id, code: verificationCode });
    user.verificationCode = verificationCode; 
    await user.save();

    res
      .status(200)
      .json({ message: "Check your email for the verification code.", userId : user._id });
  } catch (error) {
    console.log(error.message);
    
    res.status(500).send({ message: error.message });
  }
};

const verifyEmail = async (req, res) => {
  const { userId, code } = req.body;

  console.log(req.body);
  

  if (!userId || !code) {
    return res.status(400).send({ message: "Bad request" });
  }

  const user = await User.findOne({ _id: userId });

  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  if (user.status === "active") {
    return res.status(400).send({ message: "User is already verified." });
  }

  if (user.verificationCode !== code) {
    return res.status(400).send({ message: "Verification code is incorrect." });
  }

  user.status = "active";
  user.verificationCode = undefined; 
  await user.save();

  res.status(200).send({message : "verification success"});
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);

    if (!email || !password) {
      return res.status(400).send({ message: "Bad request" });
    }

    const user = await User.findOne({ email });

    

    if (!user || user.status !== "active") {
      return res
        .status(400)
        .send({ message: "User with this email is not found or not active." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send({ message: "Invalid email or password." });
    }

    const token = generateToken(user);
    res.status(200).send({ token });
  } catch (error) {
    res.status(500).send({ message: "Signin failed" });
  }
};

/* -------------------------------------------- */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );
}

async function sendEmailCode(user) {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailContent = {
    from: `${process.env.MAIL}`,
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hi ${user.name},</p><p>Your verification code is: <strong>${user.code}</strong></p>`,
  };

  await transporter.sendMail(mailContent);
}

module.exports = { verifyEmail, signup, signin };
