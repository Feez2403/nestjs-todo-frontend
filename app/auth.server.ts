import { z } from "zod";
import { getUserToken, logout } from "./session.server";

const getAuthenticatedUserSchema = z.object({
    email:      z.string(),
    id:         z.string(),
    firstName:  z.string(),
  });

export const getOptionalUser = async ({request} : {request:Request}) => {
    const userToken = await getUserToken( {request} ) 
    
    if (userToken == undefined) return null; // No user token yet, need to not send any request to auth server
    
    try{
        const response = await fetch('http://localhost:8000/auth', {
            //method: 'POST',
            //body: JSON.stringify(parsedJson),
            headers:{
            "Content-Type" : "application/json",
            "Authorization" : `Bearer ${userToken}`
            }
        });
        const data = await response.json();
        
        return getAuthenticatedUserSchema.parse(data);
    }catch(error){
        console.error(error);
        throw await logout({
            request
        })
    }
}