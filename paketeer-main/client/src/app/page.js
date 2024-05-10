"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {findParcel} from "@/lib/parcels"
import {useAppStore} from "@/state/appState"

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Home() {
	const router = useRouter();
	const { isLoading, setIsLoading } = useAppStore();
	const [trackingId, setTrackingId] = useState("");

	const trackPackage = async () => {
		if (trackingId != "" && trackingId != null) {
			const { results, error } = await findParcel(trackingId);
			if (results != null) {
				console.log("Results: ", results);
				setIsLoading(false);
				router.push("/track/" + trackingId);
			} else {
				console.log("Error: ", error);
				toast.error("Error: " + error);
			}
		} else {
            toast.error("Enter a valid parcel tracking ID.");
		}
	};

	const handleInputChange = (e) => {
		setTrackingId(e.target.value);
	};

	return (
		<main className="flex justify-center items-center pt-[200px]">
			<div className="flex flex-col justify-center gap-10 w-[800px]">
				<Card className="shadow-m">
					<CardContent className="p-[5px]">
						<div className="flex flex-row gap-2">
							<Input
								placeholder="Enter your tracking number here."
								type="text"
								className="min-w-80"
								value={trackingId}
								onChange={handleInputChange}
							/>
							<Button onClick={trackPackage}>Track Parcel</Button>
						</div>
					</CardContent>
				</Card>
				<div className="flex flex-row gap-10 w-[800px] justify-between">
					<Link href="/ship" className="w-full">
						<Card className="w-full hover:bg-blue-100">
							<CardHeader className="pb-0">
								<CardDescription>Want to</CardDescription>
								<CardTitle>Ship a Parcel ?</CardTitle>
							</CardHeader>
							<CardContent className="flex justify-center">
								<Image
									src="/images/pkt-icon.png"
									width={300}
									height={300}
									alt="Ship a Parcel"
								/>
							</CardContent>
						</Card>
					</Link>
					<Link href="/packstations" className="w-full">
						<Card className="w-full hover:bg-orange-100">
							<CardHeader className="pb-0">
								<CardDescription>View all</CardDescription>
								<CardTitle>Parcel Service Points</CardTitle>
							</CardHeader>
							<CardContent className="flex justify-center">
								<Image
									src="/images/pkt-stations.png"
									width={300}
									height={300}
									alt="Ship a Parcel"
									className="p-7"
								/>
							</CardContent>
						</Card>
					</Link>
				</div>
			</div>
		</main>
	);
}
