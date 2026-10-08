import mongoose from "mongoose";
import Friendship from "../models/friendship.model.js";
import User from "../models/user.model.js";
import { getUserPair } from "../lib/friendship.js";

const getContacts = async (req, res) => {
    try {
        const friendships = await Friendship.find({
            $or: [{ userOne: req.user._id }, { userTwo: req.user._id }],
            status: "accepted",
        })
            .populate("userOne", "fullName username profilePic")
            .populate("userTwo", "fullName username profilePic");

        const contacts = friendships.map((friendship) =>
            String(friendship.userOne._id) === String(req.user._id)
                ? friendship.userTwo
                : friendship.userOne
        );

        res.status(200).json(contacts);
    } catch (error) {
        console.error("Error loading contacts:", error.message);
        res.status(500).json({ message: "Could not load your contacts." });
    }
};

const searchUsers = async (req, res) => {
    try {
        const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
        if (search && search.length > 100) {
            return res.status(400).json({ message: "Search must be 100 characters or fewer." });
        }

        const escapedSearch = search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const users = await User.find({
            _id: { $ne: req.user._id },
            ...(escapedSearch && {
                $or: [
                    { fullName: { $regex: escapedSearch, $options: "i" } },
                    { username: { $regex: escapedSearch, $options: "i" } },
                ],
            }),
        })
            .select("fullName username profilePic")
            .sort({ fullName: 1 })
            .lean();

        const userIds = users.map((user) => user._id);
        const friendships = userIds.length
            ? await Friendship.find({
                $or: [
                    { userOne: req.user._id, userTwo: { $in: userIds } },
                    { userTwo: req.user._id, userOne: { $in: userIds } },
                ],
            })
            : [];
        const relationshipByUser = new Map(
            friendships.map((friendship) => {
                const otherUserId = String(friendship.userOne) === String(req.user._id)
                    ? String(friendship.userTwo)
                    : String(friendship.userOne);
                return [otherUserId, friendship];
            })
        );

        res.status(200).json(users.map((user) => {
            const friendship = relationshipByUser.get(String(user._id));
            const isRequester = friendship
                && String(friendship.requester) === String(req.user._id);
            return {
                ...user,
                requestStatus: friendship?.status || "none",
                requestDirection: friendship ? (isRequester ? "outgoing" : "incoming") : null,
                requestId: friendship?._id || null,
            };
        }));
    } catch (error) {
        console.error("Error searching users:", error.message);
        res.status(500).json({ message: "Could not search for people." });
    }
};

const getIncomingRequests = async (req, res) => {
    try {
        const requests = await Friendship.find({
            recipient: req.user._id,
            status: "pending",
        })
            .populate("requester", "fullName username profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json(requests.map((request) => ({
            requestId: request._id,
            requester: request.requester,
            createdAt: request.createdAt,
        })));
    } catch (error) {
        console.error("Error loading friend requests:", error.message);
        res.status(500).json({ message: "Could not load friend requests." });
    }
};

const sendRequest = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.isValidObjectId(userId)) {
            return res.status(404).json({ message: "User not found." });
        }
        if (String(userId) === String(req.user._id)) {
            return res.status(400).json({ message: "You cannot add yourself." });
        }

        const recipient = await User.findById(userId).select("_id");
        if (!recipient) return res.status(404).json({ message: "User not found." });

        const pair = getUserPair(req.user._id, userId);
        const existingRequest = await Friendship.findOne(pair);
        if (existingRequest?.status === "accepted") {
            return res.status(409).json({ message: "You are already connected." });
        }
        if (existingRequest?.status === "pending") {
            return res.status(409).json({ message: "A friend request is already pending." });
        }

        let request;
        if (existingRequest) {
            existingRequest.requester = req.user._id;
            existingRequest.recipient = userId;
            existingRequest.status = "pending";
            request = await existingRequest.save();
        } else {
            request = await Friendship.create({
                ...pair,
                requester: req.user._id,
                recipient: userId,
                status: "pending",
            });
        }

        req.app.get("io").to(`user:${userId}`).emit("friendRequestUpdated");
        res.status(201).json({ requestId: request._id, status: request.status });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "A friend request is already pending." });
        }
        console.error("Error sending friend request:", error.message);
        res.status(500).json({ message: "Could not send the friend request." });
    }
};

const respondToRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { action } = req.body;
        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(404).json({ message: "Friend request not found." });
        }
        if (!["accept", "reject"].includes(action)) {
            return res.status(400).json({ message: "Choose whether to accept or reject the request." });
        }

        const request = await Friendship.findOneAndUpdate({
            _id: requestId,
            recipient: req.user._id,
            status: "pending",
        }, { status: action === "accept" ? "accepted" : "rejected" }, { new: true });
        if (!request) {
            return res.status(404).json({ message: "This friend request is no longer available." });
        }

        req.app.get("io").to(`user:${request.requester}`).emit("friendRequestUpdated");
        req.app.get("io").to(`user:${request.recipient}`).emit("friendRequestUpdated");
        res.status(200).json({ status: request.status });
    } catch (error) {
        console.error("Error responding to friend request:", error.message);
        res.status(500).json({ message: "Could not update the friend request." });
    }
};

export default {
    getContacts,
    searchUsers,
    getIncomingRequests,
    sendRequest,
    respondToRequest,
};
