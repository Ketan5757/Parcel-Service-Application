"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DeliveryInvalid() {
	const router = useRouter();

	useEffect(() => {		
        router.push("/");
	}, []);

	return (
		<main className="flex justify-center items-center h-[500px]">
			Invalid delivery number.
		</main>
	);
}
