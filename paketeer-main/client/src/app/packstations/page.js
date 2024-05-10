"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/state/appState";
import dynamic from "next/dynamic";
import { findServicePoints } from "@/lib/dhl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus, X } from "lucide-react";

const LeafletMap = dynamic(
	() => import("../../components/leafletMap"),
	{ ssr: false }
);

const centreLocation = { lat: 49.3988, lng: 8.6724 };

export default function ServicePoints() {
	const { isLoading, setIsLoading } = useAppStore();
	const [data, setData] = useState([]);
	const [mapData, setMapData] = useState([]);
	const [isOpen, setIsOpen] = useState(true);

	useEffect(() => {
		setIsLoading(true);
		fetchPoints(100, 0, ["locker", "postbank", "postbox"]);
	}, []);

	const fetchPoints = async (limit, offset, category) => {
		const { results, error } = await findServicePoints(limit, offset, category);
		if (results != null) {
            let dataList = [];
            for (const item of results) {
                dataList.push({lat: item.place.geo.latitude, lng: item.place.geo.longitude, popUpContent: item.location.type.toUpperCase(), type: item.location.type.toUpperCase() });                
            }
			setData(results);
            setMapData(dataList);
			setIsLoading(false);
		} else {
			console.log("Error: ", error);
		}
	};

	return (
		<div className="flex flex-row flex-1 justify-between gap-10 p-10 pt-[90px] max-h-screen">
			<Card className="shadow-m w-2/6 flex flex-1 flex-col ">
				<CardHeader>
					<CardTitle>Packstation Locations</CardTitle>
				</CardHeader>
				<CardContent className="h-full overflow-y-scroll">
					{data != null && (
						<div className="flex flex-wrap gap-2">
							{data.map((item, index) => (
								<Collapsible
									key={index}
									open={isOpen}
									onOpenChange={setIsOpen}
									className="space-y-2 w-full hover:bg-blue-100 rounded-md p-2 pl-5 justify-end"
								>
									<div className="flex flex-1 items-center justify-between w-full">
										<div className="flex flex-col w-full">
											<div className="text-sm">
												{item.location.type.toUpperCase()}
											</div>
											<div className="text-md font-bold">
												{item.place.address.streetAddress}
											</div>
											<div>
												{item.place.address.addressLocality},{" "}
												{item.place.address.countryCode},{" "}
												{item.place.address.postalCode}
											</div>
										</div>
										<CollapsibleTrigger asChild>
											<Button variant="ghost" size="sm" className="w-9 p-0">
												<ChevronsUpDown className="h-4 w-4" />
												<span className="sr-only">Toggle</span>
											</Button>
										</CollapsibleTrigger>
									</div>
									<CollapsibleContent className="space-y-2">
										<div className="rounded-md border px-4 py-3 font-mono text-sm">
											Slots Available: {item.totalSlots - item.occupiedSlots}/ {item.totalSlots}
										</div>
									</CollapsibleContent>
								</Collapsible>
							))}
						</div>
					)}
				</CardContent>
			</Card>
			<div className="flex w-4/6 shadow-m">
				<LeafletMap locations={mapData} centreLocation={centreLocation} mapZoom={15} />
			</div>
		</div>
	);
}
