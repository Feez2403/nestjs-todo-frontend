import * as React from 'react';
import { Form, json, redirect, useFetcher, useLoaderData } from "@remix-run/react";
import { z } from "zod";
import { getOptionalUser } from "../auth.server";
import { getUserToken } from "../session.server";
import { Box, Button, Checkbox, Container, IconButton, List, ListItem, ListItemText, TextField, Typography } from "@mui/material";

import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

const TaskSchema = z.object({
  id: z.string(),
  content: z.string(),
  done: z.boolean(),
})

const TodoListWithTasksSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  tasks: z.array(TaskSchema).optional(),
});

const NewTaskSchema = z.object({
  content: z.string().min(1, "Task content is required"),
  action: z.string(),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().optional(),
  content: z.string().min(1, "Task content is required").optional(),
  done: z.enum(['true', 'false']).transform((value) => value === 'true'),
})


type Task = z.infer<typeof TaskSchema>;

//let todoListId : string;

export async function loader({ params }: { params: { id: string } }) {

  //todoListId = params.id;
  const response = await fetch(`${process.env.BACKEND_LINK}/todo-list/${params.id}`);

  if (!response.ok) {
    throw new Response("TodoList not found", { status: response.status });
  }

  const data = await response.json();
  // Validate with Zod
  const todoList = TodoListWithTasksSchema.safeParse(data.todolist);
  if (!todoList.success) {
    console.error("Validation error:", todoList.error.format());
    throw new Response("Invalid TodoList data", { status: 500 });
  }
  return json(todoList.data);
}

export const action = async ({ request, params }: { request: Request; params: { id: string } }) => {
  const formData = await request.formData();
  const action_ = formData.get("action");

  if (!action_){
    return new Response("Invalid form data", { status: 400 });
  }else if (action_ === "create-new-task"){
    const parsedForm = NewTaskSchema.safeParse(Object.fromEntries(formData));
    if (!parsedForm.success) {
      return new Response("Invalid form data", { status: 400 });
    }
    const { content, action } = parsedForm.data;

    const userToken = await getUserToken( {request} ) 
    const createTaskResponse = await fetch(`${process.env.BACKEND_LINK}/task/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization" : `Bearer ${userToken}`
      },
      body: JSON.stringify({ 
        "todoListId": params.id,
        "content":content
      }),
    });


    if (!createTaskResponse.ok) {
      return new Response("Failed to create task", { status: createTaskResponse.status });
    }

    return redirect(`/todo-list/${params.id}`);
  }else if( action_ === "delete-task"){
    const taskId = formData.get("taskId");

    const userToken = await getUserToken( {request} ) 
    const deleteTaskResponse = await fetch(`${process.env.BACKEND_LINK}/task/${taskId}`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        "Authorization" : `Bearer ${userToken}`
      }
    });

    if (!deleteTaskResponse.ok) {
      return new Response("Failed to create task", { status: deleteTaskResponse.status });
    }

    return redirect(`/todo-list/${params.id}`);

  }else if( action_ === "toggle-done-task"){

    const schema = UpdateTaskSchema.safeParse( Object.fromEntries(formData) )

    if (!schema.success){
      console.error("Invalid form data", schema.error)
      return new Response("Invalid form data", { status: 400 });
    }
    const {taskId, done} = schema.data
    console.log(taskId, done, !done)
    const userToken = await getUserToken( {request} ) 
    const updateTaskResponse = await fetch(`${process.env.BACKEND_LINK}/task/${taskId}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization" : `Bearer ${userToken}`
      },
      body: JSON.stringify({ 
        done:!done
      }),
    });

    if (!updateTaskResponse.ok) {
      return new Response("Failed to create task", { status: updateTaskResponse.status });
    }

    return redirect(`/todo-list/${params.id}`);

  }
  
};

export default function TodoListPage() {
  const todoList = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  const handleDelete = (taskId: string) => {
    fetcher.submit(
      { taskId:taskId, action: "delete-task" },
      { method: "post" }
    );
  };

  const handleToggleDone = (taskId: string, done:boolean) => {
    fetcher.submit(
      { taskId:taskId, done:done, action: "toggle-done-task" },
      { method: "post" }
    );
  };
  
  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      {/* Todo List Title */}
      <Typography variant="h4" component="h1" gutterBottom>
        {todoList.name || "Untitled List"}
      </Typography>

      {/* New Task Form */}
      <Form method="POST">
        <Box display="flex" gap={2} mb={3} alignItems="center">
          <TextField
            type="text"
            name="content"
            label="New Task"
            variant="outlined"
            fullWidth
            required
          />
          <input type="hidden" name="action" value="create-new-task" />
          <Button variant="contained" type="submit" size="large">
            Add
          </Button>
        </Box>
      </Form>

      {/* Task List */}
      <List>
        {todoList.tasks?.map((task:Task) => (
          <TaskItemComponent key={task.id} task={task} onDelete={handleDelete} onToggleDone={handleToggleDone}/>
          ))}
      </List>
    </Container>
  );
}

function TaskItemComponent({
  task,
  onDelete,
  onToggleDone,
}: {
  task: { id: string; content: string; done: boolean };
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done:boolean) => void;  // Function to toggle task done status
}) {
  return (
    <ListItem
      sx={{
        display: "flex",
        justifyContent: "space-between",
        bgcolor: task.done ? "action.selected" : "background.paper",
        borderRadius: 1,
        mb: 1,
        p: 2,
        border: "1px solid",
        borderColor: task.done ? "success.light" : "grey.400", // Different border color for completed tasks
      }}
    >
      {/* Checkbox on the left to toggle task status */}
      <Checkbox
        checked={task.done}
        onChange={() => onToggleDone(task.id, task.done)}  // Toggle the task status when clicked
        color="primary"
      />
      
      <ListItemText
        primary={task.content}
        secondary={task.done ? "Completed" : "Pending"}
        primaryTypographyProps={{
          sx: { textDecoration: task.done ? "line-through" : "none" },
        }}
      />
      
      {/* Delete button on the right */}
      <IconButton edge="end" color="error" onClick={() => onDelete(task.id)}>
        <DeleteForeverIcon />
      </IconButton>
    </ListItem>
  );
}