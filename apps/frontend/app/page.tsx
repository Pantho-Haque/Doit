"use client";

import { Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { observer } from "mobx-react-lite";

import todoStore from "@/storage/store";
import { useState } from "react";
import { autorun, reaction } from "mobx";

//runs immediately and on every change in the observable(completedTodosLength)
autorun(() => {
  console.log("todos:", todoStore.completedTodosLength);
});

//only runs when data() changes
reaction(
  // Data function - what to track
  () => todoStore.completedTodosLength,
  // Effect function - what to do
  (length, previousLength) => {
    console.log("todos changed from", previousLength, "to", length);
    if (length == todoStore.todos.length) {
      alert("All todos are completed");
    }
  }
);

const Home = observer(() => {
  const [addingTodoText, setAddingTodoText] = useState("");
  return (
    <div className="flex flex-col items-center h-screen p-5">
      {/* heading of application  */}
      <h1>Todo App</h1>
      {/* adding new todo to our list  */}
      <div className="flex w-[50vw] mb-5 space-x-5">
        <Input
          type="text"
          placeholder="Enter your todo"
          className="w-full"
          value={addingTodoText}
          onChange={(e) => {
            setAddingTodoText(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            todoStore.addTodo(addingTodoText);
            setAddingTodoText("");
          }}
        >
          Add Todo
        </Button>
      </div>

      {/* list view for the saved todo */}
      {todoStore.todos.length === 0 && <p>No todos</p>}
      {todoStore.todos.map((todo) => (
        <div
          key={todo.id}
          className="flex items-center justify-between w-96 p-2 border border-gray-200 rounded-md shadow-sm"
        >
          <Checkbox
            checked={todo.completed}
            onCheckedChange={() => todoStore.toggleTodo(todo.id)}
          />
          <p
            className={`text-start w-full pl-2 ${
              todo.completed ? "line-through" : ""
            }`}
          >
            {todo.title}
          </p>

          {/* settings */}
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                const updatedTitle = prompt("Enter new title");
                if (updatedTitle) {
                  todoStore.updateTodo(todo.id, updatedTitle);
                }
              }}
            >
              <Edit />
            </Button>
            <Button onClick={() => todoStore.deleteTodo(todo.id)}>
              {" "}
              <Trash2 />{" "}
            </Button>
          </div>
        </div>
      ))}

      {/* footer  */}
      <div className="fixed bottom-0 left-0 w-full bg-gray-100 p-4 text-center">
        <p className="text-sm text-gray-600">
          Built by{" "}
          <a
            href="https://pantho-haque.github.io/Pantho-Haque/"
            className="text-cyan-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pantho Haque
          </a>{" "}
          |{" "}
          <a
            href="mailto:pantho.haque.dev@gmail.com"
            className="text-cyan-600 hover:underline"
          >
            Email
          </a>
        </p>
      </div>
    </div>
  );
});

export default Home;
