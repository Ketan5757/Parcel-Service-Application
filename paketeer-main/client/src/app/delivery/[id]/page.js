"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/state/appState";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";
import { toast } from "sonner";

let socket;

import { Icons } from "@/components/icons";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

import { cn, findMidpoint } from "@/lib/utils";
import { findDelivery, updateDelivery } from "@/lib/delivery";

const LeafletMap = dynamic(() => import("../../../components/leafletMap"), {
	ssr: false,
});

export default function Delivery({ params }) {
	const router = useRouter();
	const { isLoading, setIsLoading } = useAppStore();
	const [error, setError] = useState(null);
	const [data, setData] = useState(null);
	const [status, setStatus] = useState(null);
	const [refresh, setRefresh] = useState(0);
	const [mapData, setMapData] = useState([]);
	const [routingData, setRoutingData] = useState([]);
	const [otherLines, setOtherLines] = useState([]);
	const [liveLocation, setLiveLocation] = useState(null);
	const [centreLocation, setCentreLocation] = useState({
		lat: 49.3988,
		lng: 8.6724,
	});

	useEffect(() => {
		setIsLoading(true);
		if (params.id == "undefined") {
			router.push("/");
		} else if (params.id != undefined && params.id != null && params.id != "") {
			console.log(params.id);
		}
		trackDelivery();
	}, []);

	const startDelivery = async () => {
		if (params.id != "" && params.id != null) {
			const { results, error } = await updateDelivery(
				Number(params.id),
				"ONROUTE",
				null
			);

			if (results != null) {
                setStatus("ONROUTE");
				console.log(data);
				initializeSocketConnection(params.id, data, true);
			} else {
				setError(error);
			}
		}
	};

	const initializeSocketConnection = async (
		deliveryId,
		wholeData,
		firstTime
	) => {
		socket = io("http://localhost:5000", {
			transports: ["websocket"],
		});
		socket.emit("join-room", deliveryId, () => {
			console.log("Messenger joined room.");
			if (firstTime) {
				console.log("First time flow");
				socket.emit("initiate-delivery", deliveryId, wholeData, () => {
					console.log("Delivery details emitted");
                    setRefresh(refresh+1);
				});
			} else {
				console.log("on refresh flow");
				socket.emit("resume-delivery", deliveryId, () => {
					console.log("Delivery started");
                    setRefresh(refresh+1);
				});
			}
		});

		console.log("Joined Room: ", socket);
	};

	const trackDelivery = async () => {
		if (params.id != "" && params.id != null) {
			const { results, error } = await findDelivery(params.id);
			if (results != null) {
				setIsLoading(false);
				setData(results);
                setStatus(results.status);
				setRoutingData(results.route);
				setLiveLocation({
					lat: results.route[0].path[0][0],
					lng: results.route[0].path[0][1],
					popUpContent: "Servicepoint " + results.warehouseId,
					type: "LIVE LOCATION",
				});
				let dataList = [
					{
						lat: results.sourceGeo.lat,
						lng: results.sourceGeo.lng,
						popUpContent: "Servicepoint " + results.warehouseId,
						type: "WAREHOUSE",
					},
				];
				let linesToRoad = [];
				for (const item of results.parcels) {
					dataList.push({
						lat: item.destinationGeo.lat,
						lng: item.destinationGeo.lng,
						popUpContent: "PKG #" + item.trackingId,
						type: "DESTINATION MAIN",
					});
					// dataList.push({
					// 	lat: item.deliverableGeo.closestLatitude,
					// 	lng: item.deliverableGeo.closestLongitude,
					// 	popUpContent: "PKG #" + item.trackingId,
					// 	type: "DESTINATION DROPOFF",
					// });
					linesToRoad.push([
						[item.destinationGeo.lat, item.destinationGeo.lng],
						[
							item.deliverableGeo.closestLatitude,
							item.deliverableGeo.closestLongitude,
						],
					]);
				}
				console.log(linesToRoad);
				console.log(dataList);
				setOtherLines(linesToRoad);
				setMapData(dataList);
				setCentreLocation(findMidpoint(dataList));

				if (results.status == "ONROUTE") {
					console.log("how is it this flow");
					initializeSocketConnection(params.id, results, false);
				}
			} else {
				console.log("Error: ", error);
				toast.error("Error: " + error);
			}
		} else {
			toast.error("Enter a valid parcel tracking ID.");
		}
	};

	if (socket != undefined) {
		socket.on("connect", () => {
			console.log(`${socket.id}`);
		});

		socket.on("live-location", (liveLocation) => {
			setLiveLocation(liveLocation);
		});

		socket.on("all-updates", (message) => {
			console.log(message);
		});

		socket.on("completed-delivery", (trackingId) => {
			console.log("Delivery Completed for tracking id: ", trackingId);
		});
	}

	return (
		<div className="flex flex-row flex-1 justify-between gap-10 p-10 pt-[90px] max-h-screen">
			<Card className="shadow-m w-2/6 flex flex-1 flex-col ">
				{data != null && (
					<>
						<CardHeader className="pt-5 pb-3">
							<CardDescription>DLVRY: #{params.id}</CardDescription>

							<Label htmlFor="destinationAddress" className="pt-3">
								Parcels to Deliver: {data.parcels && data.parcels.length}
							</Label>
							<div id="destinationAddress" className="flex flex-col">
								<div className="font-bold">{data.customerName}</div>
								<div className="text-sm">
									{data.destinationAddress != null && (
										<>
											{data.destinationAddress.houseName},{" "}
											{data.destinationAddress.street}
										</>
									)}
								</div>
								<div className="text-sm">
									{data.destinationAddress != null && (
										<>
											{data.destinationAddress.city},{" "}
											{data.destinationAddress.state},{" "}
											{data.destinationAddress.country}
										</>
									)}
								</div>
								<div className="text-sm">
									{data.destinationAddress != null && (
										<>{data.destinationAddress.zipcode}</>
									)}
								</div>
							</div>
						</CardHeader>
						<Separator />
						<CardContent className="h-full flex flex-col overflow-y-hidden pt-3 px-0">
							<div className="flex items-center gap-2 justify-between px-5 pb-3">
								<div className="flex flex-row flex-1 items-center gap-2 ">
									<Label htmlFor="packageStatus">Status:</Label>
									<div id="packageStatus">
										<div className="text-sm">
											{status != null && <>{status}</>}
										</div>
									</div>
								</div>
								<div>
									{status == "ONROUTE" && (
										<Badge variant="destructive" className="animate-pulse">
											LIVE
										</Badge>
									)}
								</div>
							</div>

							<div className="px-5 hover:bg-blue-100">
								<Card className="">
									<CardHeader>
										<CardTitle>Warehouse</CardTitle>
										<CardDescription>{data.warehouseId}</CardDescription>
									</CardHeader>
								</Card>
							</div>

							{data.parcels.map((item, index) => (
								<div key={index}>
									<div className="p-5 hover:bg-blue-100">
										On route to stop {index + 1}
									</div>

									<div className="px-5 hover:bg-blue-100">
										<Card className="">
											<CardHeader>
												<CardTitle>PKG #{item.trackingId}</CardTitle>
												<CardDescription></CardDescription>
											</CardHeader>
										</Card>
									</div>
								</div>
							))}
						</CardContent>
						<CardFooter className="flex justify-between py-3">
							<div className="grid w-full items-center">
								{status != "ONROUTE" && (
									<button
										className={cn(buttonVariants())}
										disabled={isLoading}
										onClick={startDelivery}
									>
										{isLoading && (
											<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
										)}
										Start Delivery
									</button>
								)}
								{error != "" && (
									<p className="px-1 text-xs text-red-600 justify-center text-center">
										{error}
									</p>
								)}
							</div>
						</CardFooter>
					</>
				)}
			</Card>
			<div className="flex w-4/6 shadow-m">
				<LeafletMap
					locations={mapData}
					centreLocation={centreLocation}
					mapZoom={13}
					routeData={routingData}
					liveLocation={liveLocation}
                    refresh={refresh}
				/>
			</div>
		</div>
	);
}
