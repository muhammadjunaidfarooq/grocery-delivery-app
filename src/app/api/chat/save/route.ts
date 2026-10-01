import connectDb from "@/lib/mongodb"
import { canAccessOrder } from "@/lib/orderAccess"
import { requireSessionOrSocketSecret } from "@/lib/socketAuth"
import Message from "@/models/message.model"
import Order from "@/models/order.model"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req:NextRequest) {
    try {
        const authResult=await requireSessionOrSocketSecret(req)
        if ("error" in authResult) return authResult.error

        await connectDb()
        const body=await req.json()
        const {text,roomId,time}=body
        // Logged-in users cannot pretend to be someone else: senderId comes from
        // the session. The socket server (secret header) is trusted to name the sender.
        const senderId=authResult.via==="session"?authResult.user.id:body.senderId
        const room=await Order.findById(roomId)
        if(!room){
            return NextResponse.json(
                {message:`room not found`},{status:400}
            )
        }

        if(authResult.via==="session" && !canAccessOrder(room,authResult.user)){
            return NextResponse.json(
                {message:"Forbidden"},{status:403}
            )
        }

        const message=await Message.create({
            senderId,text,roomId,time
        })
        return NextResponse.json(
            message,{status:200}
        )
    } catch (error) {
        return NextResponse.json(
            {message:`save message error ${error}`},{status:500}
        )
    }
}