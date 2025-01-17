"use client";
import { action, computed, makeObservable, observable } from "mobx";

type TODO = {
  id: number;
  title: string;
  completed: boolean;
};

// fuction that stores all todos into local storage on browser
const saveToLocalStorage = (todos: TODO[]) => {
  localStorage.setItem("todos", JSON.stringify(todos));
};
// function that gets all todos from local storage
const getFromLocalStorage = (): TODO[] => {
  const todos = localStorage.getItem("todos");
  return todos ? JSON.parse(todos) : [];
};

class TodoStore {
  todos: TODO[] = [];

  constructor() {
    this.todos = getFromLocalStorage();

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
  addTodo = (todo: TODO) => {
    this.todos.push(todo);
    saveToLocalStorage(this.todos);
  };

  deleteTodo = (id: number) => {
    this.todos = this.todos.filter((todo) => todo.id !== id);
    saveToLocalStorage(this.todos);
  };
  updateTodo = (id: number, title: string) => {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.title = title;
    }
    saveToLocalStorage(this.todos);
  };

  toggleTodo = (id: number) => {
    const todo = this.todos.find((todo) => todo.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
    saveToLocalStorage(this.todos);
  };

  // computed
  get completedTodosLength() {
    return this.todos.filter((todo) => todo.completed).length;
  }
}

const todoStore = new TodoStore();
export default todoStore;
