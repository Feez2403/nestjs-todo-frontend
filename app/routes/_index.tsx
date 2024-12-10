import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, json } from "@remix-run/react";
import { z } from "zod";
import { useOptionalUser } from "../root";
import { authenticateUser } from '../session.server' 
import { tokenSchema } from "./register";

const loginSchema = z.object({
  email:z.string(),
  password:z.string(),
});



export const action = async ({ request } : ActionFunctionArgs) => {
  // get form input
  const formdata = await request.formData()
  const jsonData = Object.fromEntries(formdata)
  const parsedJson = loginSchema.parse(jsonData);
  
  // call nestjs api and get back auth token
  const response = await fetch(`${process.env.BACKEND_LINK}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(parsedJson),
    headers:{
      "Content-Type" : "application/json",
    }
  });

  // in case of success get back access token and store it into cookie session
  const {access_token, message, error } = tokenSchema.parse(
    await response.json()
  );

  if (error && message){
    // error => print error
    return json({error, message})
  }else if (access_token){

    // success send auth request to the server
    return authenticateUser({
      request: request,
      userToken: access_token
    })
  }

  //should never happen
  throw new Error("Une erreur improbable est survenue")
}
export default function Index() {
  const user = useOptionalUser();
  const isConnected = user!==null;
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-16">
        {isConnected ? 
            <h1>Welcome {user.firstName}</h1>
          : <LoginForm/>}
        {/*<span>{isLoggedIn? "CONNECTED": "NOT CONNECTED"}</span>*/}
        
      </div>
    </div>
  );
}

const LoginForm = () => { 
  return (<div><Form method="POST">
    <input type="email" name="email" required/>
    <input type="password" name="password" required/>
    <button type="submit"> Connect </button>
  </Form>
  <a href="/forgot-password">Forgot password ?</a>
  </div>)
}
