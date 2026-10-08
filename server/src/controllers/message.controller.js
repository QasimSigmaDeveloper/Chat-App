import Message from "../models/message.model.js";
import mongoose from "mongoose";
import { Readable } from 'node:stream';
import {cloudinary} from '../lib/cloudinary.js'
import { getFriendshipBetween } from "../lib/friendship.js";

const uploadAudio = (dataUri, mimeType) => {
    const encodedAudio = dataUri.slice(dataUri.indexOf(',') + 1);
    const audioBuffer = Buffer.from(encodedAudio, 'base64');
    const format = mimeType.split('/')[1].split(';')[0];

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {resource_type:'video',format},
            (error, result) => {
                if(error) return reject(error);
                if(!result?.secure_url) return reject(new Error('Cloudinary did not return an audio URL'));
                resolve(result);
            }
        );
        Readable.from([audioBuffer]).pipe(uploadStream);
    });
}

const getMessage = async (req,res)=>{
 try {
    const {id:userChatId} = req.params;
    const myId = req.user._id;
    if(!mongoose.isValidObjectId(userChatId)) {
        return res.status(404).json({message:'User not found.'});
    }
    const friendship = await getFriendshipBetween(myId, userChatId, 'accepted');
    if(!friendship) return res.status(403).json({message:'Accept this user’s friend request before starting a conversation.'});

    const message = await Message.find({
        $or:[
            {senderId:myId,receiverId:userChatId},
            {senderId:userChatId,receiverId:myId}
        ]
    }).sort({createdAt:1})
    res.status(200).json(message)
    
 } catch (error) {
        console.log('Error in getMessage controller: ',error.message);
        res.status(500).json({message:'Internal server Error'})
 }
}

const sendMessage = async (req,res) =>{
    try {
        const {text,image,audio} = req.body;
        const {id:receiverId} =req.params;
        const senderId = req.user._id;
        if(!mongoose.isValidObjectId(receiverId)) {
            return res.status(404).json({message:'User not found.'});
        }
        const friendship = await getFriendshipBetween(senderId, receiverId, 'accepted');
        if(!friendship) {
            return res.status(403).json({message:'Accept this user’s friend request before sending a message.'});
        }

        if(text !== undefined && (typeof text !== 'string' || text.length > 5000)) {
            return res.status(400).json({message:'Message text must be 5000 characters or fewer'});
        }
        if(!text?.trim() && !image && !audio) return res.status(400).json({message:'A message, image, or voice note is required'});
        if(image && audio) return res.status(400).json({message:'Send an image or a voice note, not both at once'});
        if(image && (typeof image !== 'string' || image.length > 7_500_000 || !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(image))) {
            return res.status(400).json({message:'The image attachment is invalid'});
        }
        const audioMatch = typeof audio === 'string'
            ? audio.match(/^data:(audio\/[a-zA-Z0-9.+-]+)((?:;[a-zA-Z0-9=.+-]+)*);base64,([\s\S]*)$/)
            : null;
        const audioPayload = audioMatch?.[3];
        if(audio && (
            !audioMatch ||
            !audioPayload ||
            !/^[A-Za-z0-9+/]+={0,2}$/.test(audioPayload) ||
            audioPayload.length % 4 === 1 ||
            Buffer.byteLength(audioPayload, 'base64') > 6 * 1024 * 1024
        )) {
            return res.status(400).json({message:'The voice note is invalid'});
        }

        let imageUrl;
        let audioUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url
        }
        if(audio){
            const uploadResponse = await uploadAudio(audio, audioMatch[1]);
            audioUrl = uploadResponse.secure_url
        }
        const newMessage = new Message({
            senderId,
            receiverId,
            text: text?.trim() || '',
            image:imageUrl,
            audio:audioUrl,
        })
        await newMessage.save();

        const message = newMessage.toObject()
        req.app.get('io').to(`user:${receiverId}`).emit('newMessage', message)
        res.status(201).json(message)
    } catch (error) {
        console.error('Error sending message:', error.name, error.http_code || '');
        res.status(502).json({message:'Message upload failed. Please try again.'})
    }
}
export default {
    getMessage,
    sendMessage,
};