import type { ActionFunctionArgs, LoaderFunctionArgs} from "@remix-run/node";
import { Form, json, Link, redirect, useActionData, useLoaderData  } from "@remix-run/react";
import { z } from "zod";
import { getOptionalUser } from "../auth.server";


const actionSchema = z.object({
    action: z.enum(['request-password-reset', 'reset-password'])
})
const forgotPasswordSchema = z.object({
    email:z.string({
        required_error: "Email Adress required",
        invalid_type_error : "You must provide a valid email adress"
    }).email({
        message : "You must provide a valid email adress"
    })
});

const resetPasswordSchema = z.object({
    password: z.string({
        required_error: "Password required"
      }).min(6, {
        message: "Your password must contain at least 6 characters"
      }),
      passwordConfirmation: z.string({
        required_error: "Password required"
      }).min(6, {
        message: "Your password must contain at least 6 characters"
      }),
})

export const feedbackSchema = z.object({
    message: z.string(),
    error: z.boolean(),
})

export const loader = async ({ request } : LoaderFunctionArgs) => {  
    const user = await getOptionalUser({request});
  
    if (user){
        return redirect('/')
    }

    const urlParams = new URL(request.url).searchParams;
    const token = urlParams.get('token')
    console.log(token);

    const response = await fetch(
        `${process.env.BACKEND_LINK}/auth/verify-reset-password-token?token=${token}`, {
        headers:{
            "Content-Type" : "application/json",
        }
    });

    const jsonResponse = await response.json()
    console.log(jsonResponse);
  
    const {error, message} = feedbackSchema.parse(jsonResponse);

  
    return json({
        error, message, token
    });
}

export const action = async ({ request } : ActionFunctionArgs) => {
    // get form input
    const formdata = await request.formData()
    const jsonData = Object.fromEntries(formdata)

    const parsedAction = actionSchema.safeParse(jsonData)
    
    if (parsedAction.success === false){
        const { error } = parsedAction;

        return json({
            error: true,
            message: `Failed to parse actions : ${error}`,
            token : '',
        })
    }
    const {action} = parsedAction.data;

    switch (action){
        case "request-password-reset": {
            const parsedJson = forgotPasswordSchema.safeParse(jsonData);

            if (parsedJson.success === false){
                const { error } = parsedJson;
                return json({
                    error: true,
                    message: error.errors.map(err => err.message).join(','),
                    token : '',
                })
            }

            console.log(parsedJson, "FROM REGISTER.tsx");
        
            // call nestjs api and get back auth token
            const response = await fetch('http://localhost:8000/auth/request-reset-password', {
                method: 'POST',
                body: JSON.stringify(parsedJson.data),
                headers:{
                    "Content-Type" : "application/json",
                }
            });

            // in case of success get back access token and store it into cookie session
            const jsonResponse = await response.json()
            console.log(jsonResponse);
        
            const {error, message} = feedbackSchema.parse(jsonResponse);

        
            return json({
                error, message, token:''
            });
        }
        case "reset-password" : {
            console.log(jsonData)
            const parsedJson = resetPasswordSchema.safeParse(jsonData);

            console.log("RESET-PASSWORD", parsedJson.error)
            if (parsedJson.success === false){
                const { error } = parsedJson;
                return json({
                    error: true,
                    message: error.errors.map(err => err.message).join(','),
                    token : '',
                })
            }

            console.log(parsedJson, "FROM REGISTER.tsx");
            const {password, passwordConfirmation} = parsedJson.data

            if (password !== passwordConfirmation){
                return json({
                    error: true,
                    message: "Passwords no not match",
                    token : '',
                })
            }

            const urlParams = new URL(request.url).searchParams;
            const token = urlParams.get('token')
            // call nestjs api and get back auth token
            const response = await fetch('http://localhost:8000/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ password, token }),
                headers:{
                    "Content-Type" : "application/json",
                }
            });

            // in case of success get back access token and store it into cookie session
            const jsonResponse = await response.json()
            console.log(jsonResponse);
        
            const {error, message} = feedbackSchema.parse(jsonResponse);

        
            return json({
                error, message, token:''
            });
        }

    }

    
}
export default function ForgotPasswordForm() {
    const {error, message, token} = useLoaderData<typeof loader>();
    const formFeedback = useActionData<typeof action>();

    if (!token) {
        return (
        <div>
            <h2> Password recovery </h2>
            <Form method="POST">
                <input type="email" name="email" placeholder="your email" required/> 
                <input type="hidden" name="action" value = "request-reset-password"/>
                <button type="submit"> Reset Password </button>
                {formFeedback?.message? <span style={{
                color: formFeedback?.error? 'red': 'green'
            }}>{formFeedback.message}</span> : null}
            </Form>
        </div>
        )
    }
    else if (token && error) { 
        return <>
        <span style={{color: 'red'}}>{message}</span>
        <Link to='/'>Back to home</Link>
        </>
    }
    else if (token && !error){
        return (
            <div>
                <h2> Select your new password </h2>
                <Form method="POST">
                    <input type="password" name="password" placeholder="password" required/> 
                    <input type="password" name="passwordConfirmation" placeholder="password confirmation" required/> 
                    <input type="hidden" name="action" value = "reset-password"/>
                    <button type="submit"> Reset Password </button>
                    {formFeedback?.message? <span style={{
                    color: formFeedback?.error? 'red': 'green'
                }}>{formFeedback.message}</span> : null}
                </Form>
            </div>
            )
    }
}