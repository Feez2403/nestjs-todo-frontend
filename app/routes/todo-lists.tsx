import type { ActionFunction, ActionFunctionArgs, LoaderFunctionArgs} from "@remix-run/node";
import { Form, json, redirect, useActionData, useLoaderData  } from "@remix-run/react";
import { z } from "zod";
import { getOptionalUser } from "../auth.server";
import { authenticateUser, commitUserToken, getUserToken } from '../session.server' 


const TodoListWithTasksSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  tasks: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      done: z.boolean(),
    })
  ).optional(),
});

type TodoList = z.infer<typeof TodoListWithTasksSchema>;

const ArrayTodoListWithTasksSchema = z.array(TodoListWithTasksSchema)

export const loader = async ({ request } : LoaderFunctionArgs) => {  
  const user = await getOptionalUser({request});
  
  if (!user){
      return redirect('/')
  }
  const userToken = await getUserToken( {request} ) 

  const response = await fetch(`${process.env.BACKEND_LINK}/todo-list`, {
    method: 'GET',
    headers:{
      "Content-Type" : "application/json",
      "Authorization" : `Bearer ${userToken}`
    }
  });
  
  const data = await response.json();
  const todoLists = ArrayTodoListWithTasksSchema.safeParse(data.todolists);
  if (!todoLists.success) {
    console.error("Validation error:", todoLists.error.format());
    throw new Response("Invalid TodoList data", { status: 500 });
  }
  return json(todoLists.data)
}
/*
export const action = async ({ request } : ActionFunctionArgs) => {
  // get form input
  const formdata = await request.formData()
  const jsonData = Object.fromEntries(formdata)
  const parsedJson = todoListSchema.safeParse(jsonData);

  if (parsedJson.success === false){
    const { error } = parsedJson;
    return Response.json({
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
  console.log(jsonResponse);
  
  const {access_token, error, message} = tokenSchema.parse(jsonResponse);

  if(error){
    return Response.json({
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
  return Response.json({
    error: "Something went wrong ..."
  })
}

*/

export default function TodoListsPage() {
  const todoLists = useLoaderData<typeof loader>();
  

  return (
    <div>
      
      <h1>My Todolists</h1>

      {todoLists.map((todolist: TodoList) => (
        <form action={`/todo-list/${todolist.id}`}>
          <button key={todolist.id} >
            {todolist.name}
          </button>
        </form>
      ))}
    </div>
  );
}