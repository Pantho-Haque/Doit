# Todo App with MobX

This is a simple Todo application built with React, Next.js, and MobX. The application demonstrates various functionalities of MobX, including state management, actions, and computed values.

## Features

- Add new todos
- Delete existing todos
- Toggle the completion status of todos
- Edit todo titles
- Persist todos in local storage
- Display the number of completed todos
- Alert when all todos are completed

## Technologies Used

- React
- Next.js
- MobX
- TypeScript
- Tailwind CSS
- Radix UI
- Lucide React

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/todo-app.git
   cd todo-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Project Structure

- `/storage`: Contains the MobX store for managing todos.
- `/app`: Contains the main application page.

## Usage

### Adding a Todo

1. Enter the todo text in the input field.
2. Click the "Add Todo" button.
![Adding a Todo](./pictures/adding-todo.png)

### Deleting a Todo

1. Click the "Delete" button next to the todo you want to delete.
![Deleting a Todo](./pictures/deleting-todo.png)

### Toggling a Todo

1. Click the checkbox next to the todo to toggle its completion status.
![Toggling a Todo](./pictures/toggling-todo.png)

### Editing a Todo

1. Click the "Edit" button next to the todo you want to edit.
2. Enter the new title in the prompt and click "OK".
![Editing a Todo](./pictures/editing-todo.png)

## Author

Built by [Pantho Haque](https://pantho-haque.github.io/Pantho-Haque/). For any inquiries, please contact me at [pantho.haque.dev@gmail.com](mailto:pantho.haque.dev@gmail.com).


<!-- 
    ssh-keygen -t ed25519 -C "pantho.haque.dev@gmail.com"
    ssh-keygen -t rsa -b 4096 -C "pantho.haque.dev@gmail.com" 
    ls -al ~/.ssh 
    eval "$(ssh-agent -s)" 
    ssh-add ~/.ssh/id_rsa 
    sudo apt-get install xclip
    xclip -sel clip < ~/.ssh/id_rsa.pub

    ssh-add ~/.ssh/id_ed25519
    cat ~/.ssh/id_ed25519.pub
        ssh-ed25519
        AAAAC3NzaC1lZDI1NTE5AAAAIMex9kQ9vIcNpkSTWryhTRcmhBBSAOdJWVNShmrvNhic 
        pantho.haque.dev@gmail.com

    ssh -T git@github.com (check the connection , if the given fingerprint is same as mentioned https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints , press yes )
 -->