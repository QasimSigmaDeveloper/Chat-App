import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
    {
        userOne: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userTwo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
            required: true,
        },
    },
    { timestamps: true }
);

friendshipSchema.index({ userOne: 1, userTwo: 1 }, { unique: true });

const Friendship = mongoose.model("Friendship", friendshipSchema);
export default Friendship;
