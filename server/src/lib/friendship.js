import Friendship from "../models/friendship.model.js";

export const getUserPair = (firstUserId, secondUserId) => {
    const ids = [String(firstUserId), String(secondUserId)].sort();
    return { userOne: ids[0], userTwo: ids[1] };
};

export const getFriendshipBetween = (firstUserId, secondUserId, status) => {
    const query = getUserPair(firstUserId, secondUserId);
    if (status) query.status = status;
    return Friendship.findOne(query);
};
