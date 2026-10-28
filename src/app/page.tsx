import ChatApp from "@/components/ChatApp";

// The page shell is static; all data is loaded on the client from the API,
// so the build never needs a database connection.
export default function Home() {
  return <ChatApp />;
}
