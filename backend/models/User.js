import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: { type: String, trim: true },
		email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
		googleId: { type: String, unique: true, sparse: true },
		picture: { type: String, default: null },
		authProvider: { type: String, enum: ["google", "local"], default: "google" },
		password: { type: String, select: false },
		googleProfile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
	},
	{ timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;