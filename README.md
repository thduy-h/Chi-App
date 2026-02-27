# E-Commerce Next.js Project

This project is a simple e-commerce application built with Next.js. It utilizes the [Fake Store API](https://fakestoreapi.com/) for fetching product data. The user interface is designed using Tailwind CSS, with inspiration and components sourced from [Meraki UI](https://merakiui.com) and [Hyper UI](https://www.hyperui.dev).

## LoveHub Quick Start

### Setup
1. Install dependencies:
```bash
npm install
```
2. Create local env file:
```bash
cp .env.example .env.local
```
3. Start development server:
```bash
npm run dev
```
4. Build for production check:
```bash
npm run build
```

### Environment Variables
Add these in `.env.local` (or Vercel project settings):

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Optional | Base URL for legacy product pages (default Fake Store API). |
| `FORMSPREE_ORDER_URL` | Optional* | Destination for `/api/order` forwarding. |
| `ORDER_WEBHOOK_URL` | Optional* | Fallback destination for `/api/order` when Formspree URL is missing. |
| `FORMSPREE_LETTERS_URL` | Optional* | Destination for `/api/letters` forwarding. |
| `LETTERS_WEBHOOK_URL` | Optional* | Fallback destination for `/api/letters` when Formspree URL is missing. |

\* For each feature (`/food`, `/letters`), set at least one destination URL so submit actions can forward successfully.

### Deploy To Vercel
1. Push your branch to GitHub.
2. In Vercel, click **Add New Project** and import this repo.
3. Set the environment variables listed above in **Project Settings -> Environment Variables**.
4. Deploy (Vercel runs `npm run build` automatically).
5. Verify routes: `/food`, `/tasks`, `/finance`, `/letters`, `/cycle`.

## Features

- Product listing and filtering
- Shopping cart functionality
- User authentication for login
- Dark Mode for a more immersive experience


## Getting Started

To run the project locally, follow these steps:

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Open your browser and navigate to [http://localhost:3000](http://localhost:30000)

Feel free to explore the various features of the application and provide feedback or contribute to its development!

## Built With

- [Next.js](https://nextjs.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Fake Store API](https://fakestoreapi.com/)
- [Meraki UI](https://merakiui.com)
- [Hyper UI](https://www.hyperui.dev)

## Screenshots

<details style='margin-bottom: 5px'>
  <summary>Homepage</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/home-light.png" alt="Light Mode" width="400">
    <img src="screenshots/home-dark.png" alt="Dark Mode" width="400">
  </div>
</details>


<details style='margin-bottom: 5px'>
  <summary>Products</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/products-light.png" alt="Light Mode" width="400">
    <img src="screenshots/products-dark.png" alt="Dark Mode" width="400">
  </div>
</details>


<details style='margin-bottom: 5px'>
  <summary>Product</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/product-light.png" alt="Light Mode" width="400">
    <img src="screenshots/product-dark.png" alt="Dark Mode" width="400">
  </div>
</details>


<details style='margin-bottom: 5px'>
  <summary>Cart</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/cart-light.png" alt="Light Mode" width="400">
    <img src="screenshots/cart-dark.png" alt="Dark Mode" width="400">
  </div>
</details>

<details style='margin-bottom: 5px'>
  <summary>Login</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/login-light.png" alt="Dark Mode" width="400">
    <img src="screenshots/login-dark.png" alt="Light Mode" width="400">
  </div>
</details>

<details style='margin-bottom: 5px'>
  <summary>Contact Us</summary>

  <div style="display: flex;gap:10px; padding:5px 0;">
    <img src="screenshots/contact-us-light.png" alt="Light Mode" width="400">
    <img src="screenshots/contact-us-dark.png" alt="Dark Mode" width="400">
  </div>
</details>

##### And Many More...

## Same project in other frameworks
[Svelte Kit](https://github.com/emrullaher/sveltekit-tailwind-ecommerce)


## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

