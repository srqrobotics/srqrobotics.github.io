import {
  isRouteErrorResponse,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";
import Layout from "./components/Layout/Layout";
import { FileProvider } from "./contexts/FileContext";
import { CoordinateProvider } from "./contexts/CoordinateContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AutoRoutingProvider } from "~/contexts/AutoRoutingContext";
import { ComponentProvider } from "~/contexts/ComponentContext";
import { RightSidebarProvider } from "~/contexts/RightSidebarContext";
import { CanvasRefreshProvider } from "~/contexts/CanvasRefreshContext";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
];

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <FileProvider>
            <CoordinateProvider>
              <AutoRoutingProvider>
                <ComponentProvider>
                  <RightSidebarProvider>
                    <CanvasRefreshProvider>
                      <Layout />
                    </CanvasRefreshProvider>
                  </RightSidebarProvider>
                </ComponentProvider>
              </AutoRoutingProvider>
            </CoordinateProvider>
          </FileProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <RootLayout>
      <FileProvider>
        <CoordinateProvider>
          <AutoRoutingProvider>
            <ComponentProvider>
              <RightSidebarProvider>
                <CanvasRefreshProvider>
                  <Layout />
                </CanvasRefreshProvider>
              </RightSidebarProvider>
            </ComponentProvider>
          </AutoRoutingProvider>
        </CoordinateProvider>
      </FileProvider>
    </RootLayout>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
