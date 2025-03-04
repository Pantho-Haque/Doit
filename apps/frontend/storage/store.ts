"use client";
import { action, computed, makeObservable, observable ,runInAction } from "mobx";
import { trpcClient } from "../src/utils/trpc";

type TODO = {
  id: string;
  title: string;
  completed: boolean;
};

// function that stores all todos into local storage on browser
const saveToLocalStorage = (todos: TODO[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("todos", JSON.stringify(todos));
  }
};

// function that gets all todos from local storage
const getFromLocalStorage = async (): Promise<TODO[]> => {
  // if (typeof window !== "undefined") {
  //   const todos = localStorage.getItem("todos");
  //   return todos ? JSON.parse(todos) : [];
  // }
  //return [];
  try {
    const todos = await trpcClient.getTodos.query()
    console.log(todos);
    return todos;
  } catch (error) {
    console.error("Error fetching todos:", error);
    return [];
  }
};

class TodoStore {
  todos: TODO[] = [];

  constructor() {
    this.todos =  [];
    getFromLocalStorage().then((todos) => {
      this.todos = todos;
    });

    makeObservable(this, {
      todos: observable,
      addTodo: action,
      deleteTodo: action,
      toggleTodo: action,
      updateTodo: action,
      completedTodosLength: computed,
    });
    // or we can use makeAutoObservable(this)
  }

  // action
  // addTodo = (todo: TODO) => {
  //   this.todos.push(todo);
  //   saveToLocalStorage(this.todos);
  // };
  async addTodo(title: string) {
    try {
      const newTodo = await trpcClient.addTodo.mutate({ title });
      runInAction(() => {
        this.todos.push(newTodo);
      });
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  }

  // deleteTodo = (id: number) => {
  //   this.todos = this.todos.filter((todo) => todo.id !== id);
  //   saveToLocalStorage(this.todos);
  // };

  async deleteTodo(id: string) {
    try {
      await trpcClient.deleteTodo.mutate({ id });
      runInAction(() => {
        this.todos = this.todos.filter((todo) => todo.id !== id);
      });
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  }


  // updateTodo = (id: number, title: string) => {
  //   const todo = this.todos.find((todo) => todo.id === id);
  //   if (todo) {
  //     todo.title = title;
  //   }
  //   saveToLocalStorage(this.todos);
  // };
  async updateTodo(id: string, title: string) {
    try {
      const updatedTodo = await trpcClient.updateTodo.mutate({ id, title });
      runInAction(() => {
        const index = this.todos.findIndex((todo) => todo.id === id);
        if (index !== -1) {
          this.todos[index] = updatedTodo;
        }
      });
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  }

  // toggleTodo = (id: number) => {
  //   const todo = this.todos.find((todo) => todo.id === id);
  //   if (todo) {
  //     todo.completed = !todo.completed;
  //   }
  //   saveToLocalStorage(this.todos);
  // };
  async toggleTodo(id: string) {
    try {
      const toggledTodo = await trpcClient.toggleTodo.mutate({ id });
      runInAction(() => {
        const index = this.todos.findIndex((todo) => todo.id === id);
        if (index !== -1) {
          this.todos[index] = toggledTodo;
        }
      });
    } catch (error) {
      console.error("Error toggling todo:", error);
    }
  }

  // computed
  get completedTodosLength() {
    return this.todos.filter((todo) => todo.completed).length;
  }
}

const todoStore = new TodoStore();
export default todoStore;
