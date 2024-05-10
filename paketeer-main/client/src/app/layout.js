import { Inter } from "next/font/google";
import "../assets/css/globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "Paketeer",
	description: "Package delivery tracker.",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<head>
				<link rel="shortcut icon" href="/images/paketeer.png" />
			</head>
			<body
				className={`${inter.className} bg-[url('/images/bg.png')] bg-no-repeat bg-cover bg-fixed max-h-screen`}
			>
				<div className="flex flex-col h-screen bg-opacity-90 bg-white bg-fixed">
					<div className="flex flex-col flex-1 ">
						<Navbar />
						{children}
						<Footer />
					</div>
				</div>
				<Toaster />
			</body>
		</html>
	);
}
