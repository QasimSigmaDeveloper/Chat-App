 import { generateToken } from "../lib/utilis.js";
import User from "../models/user.model.js";
 import bcrypt from 'bcryptjs'
import {cloudinary} from '../lib/cloudinary.js'

 const signup = async (req,res)=>{
    const {fullName, username, email, password} = req.body;
    try {
        if(!fullName?.trim() || !username?.trim() || !email?.trim() || !password) return res.status(400).json({message:"All fields are required"});
        if(password.length < 6) return res.status(400).json({message:"Password must be atleast 6 characters"});
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim().toLowerCase();
        if(!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
            return res.status(400).json({message:"Username must be 3–20 characters and use only letters, numbers, or underscores."});
        }
        const user = await User.findOne({$or:[{email: normalizedEmail},{username: normalizedUsername}]});
        if(user?.email === normalizedEmail) return res.status(400).json({message:"Email already exists"});
        if(user?.username === normalizedUsername) return res.status(400).json({message:"Username is already taken"});

        const salt =await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            fullName: fullName.trim(),
            username: normalizedUsername,
            email: normalizedEmail,
            password:hashPassword
        })

        if(newUser){
            await newUser.save()
            generateToken(newUser._id,res)

            res.status(201).json({
                _id:newUser._id,
                fullName:newUser.fullName,
                username:newUser.username,
                email:newUser.email,
                profilePic:newUser.profilePic
            }); 
        }else {
            res.status(400).json({message:"Invalid User Data"});
        }
    } catch (error) {
        if(error.code === 11000 && error.keyPattern?.username) {
            return res.status(409).json({message:"Username is already taken"});
        }
        console.log('Error in signup controller: ',error.message);
        res.status(500).json({message:'Internal server Error'})
        
    }
}


 const login = async (req,res)=>{
    const {email,password}=req.body

    try {
        const user = await User.findOne({email: email?.trim().toLowerCase()})
        if(!user) return res.status(400).json({message:"Invalid Credentials"});

        const isPasswordCorrect = await bcrypt.compare(password,user.password)
        if(!isPasswordCorrect) return res.status(400).json({message:"Invalid Credentials"});

        generateToken(user._id,res)
        res.status(200).json({
            _id:user._id,
            fullName:user.fullName,
            username:user.username,
            email:user.email,
            profilePic:user.profilePic
        });
    } catch (error) {
                console.log('Error in login controller: ',error.message);
                res.status(500).json({message:'Internal server Error'})
    }
}


 const logout = (req,res)=>{
    try {
        res.cookie("jwt","",{maxAge:0})
        res.status(200).json({message:"Logged out successfully"})
    } catch (error) {
        console.log('Error in logout controller: ',error.message);
        res.status(500).json({message:'Internal server Error'})
    }
}

const updateProfile = async (req,res)=>{
    try {
        const {profilePic} = req.body;
        const userId = req.user._id;

        if(!profilePic) {
            return res.status(400).json({message:'Profile Pic is required'})
        }

        const uploadResponse =await cloudinary.uploader.upload(profilePic)
        const updatedUser = await User.findByIdAndUpdate(userId,{profilePic:uploadResponse.secure_url},{new:true})
        res.status(200).json(updatedUser)
    } catch (error) {
        console.log('Error in updateProfile controller: ',error.message);
        res.status(500).json({message:'Internal server Error'})
    }
}

const checkAuth = (req,res)=>{
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.log('Error in checkAuth controller: ',error.message);
        res.status(500).json({message:'Internal server Error'}) 
    }
}

export default {
    signup,
    login,
    logout,
    updateProfile,
    checkAuth,
}