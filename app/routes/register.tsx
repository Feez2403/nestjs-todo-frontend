import type { ActionFunction, ActionFunctionArgs, LoaderFunctionArgs} from "@remix-run/node";
import { Form, json, redirect, useActionData, useLoaderData  } from "@remix-run/react";
import { z } from "zod";
import { getOptionalUser } from "../auth.server";
import { authenticateUser, commitUserToken, getUserToken } from '../session.server' 

const registerSchema = z.object({
  email:z.string({
    required_error: "Email Adress required",
    invalid_type_error : "You must provide a valid email adress"
  }).email({
    message : "You must provide a valid email adress"
  }),
  password:z.string({
    required_error: "Password required"
  }).min(6, {
    message: "Your password must contain at least 6 characters"
  }),
  firstName:z.string({
    required_error: "You must provide a first name",
  }),
});

export const tokenSchema = z.object({
    access_token: z.string().optional(),
    message: z.string().optional(),
    error: z.boolean().optional(),
})

export const loader = async ({ request } : LoaderFunctionArgs) => {  
  const user = await getOptionalUser({request});
  
    if (user){
        return redirect('/')
    }

  return json({})
}

export const action = async ({ request } : ActionFunctionArgs) => {
  // get form input
  const formdata = await request.formData()
  const jsonData = Object.fromEntries(formdata)
  const parsedJson = registerSchema.safeParse(jsonData);

  if (parsedJson.success === false){
    const { error } = parsedJson;
    return json({
        error: true,
        message: error.errors.map(err => err.message).join(',')

    })
  }

  
  // call nestjs api and get back auth token
  const response = await fetch(`${process.env.BACKEND_LINK}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(parsedJson.data),
    headers:{
      "Content-Type" : "application/json",
    }
  });

  // in case of success get back access token and store it into cookie session
  const jsonResponse = await response.json()
  
  const {access_token, error, message} = tokenSchema.parse(jsonResponse);

  if(error){
    return json({
        error, message
    });
  }
  if (access_token){
    return await authenticateUser({
        request:request, 
        userToken: access_token,
    })
  }
  //should never happen
  return json({
    error: "Something went wrong ..."
  })
}
export default function RegisterForm() {
    const formFeedback = useActionData<typeof action>();
    return (<Form method="POST">
        <input type="text" name="firstName" placeholder="your first name" required/>
        <input type="email" name="email" placeholder="your email" required/>
        <input type="password" name="password" placeholder="your password" minLength = {6} required/>    
        {formFeedback?.message? <span style={{
            color: formFeedback?.error? 'red': 'green'
        }}>{formFeedback.message}</span> : null}
        <button type="submit"> Create Account </button>
    </Form>)
}