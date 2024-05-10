"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TrackingInvalid() {
	const router = useRouter();

	useEffect(() => {		
        router.push("/");
	}, []);

	return (
		<main className="flex justify-center items-center h-[500px]">
			Invalid tracking number.
		</main>
	);
}
