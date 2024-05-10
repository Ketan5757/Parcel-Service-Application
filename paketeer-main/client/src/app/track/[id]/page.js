"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/state/appState";
import dynamic from "next/dynamic";
import { findParcel, updateParcel } from "@/lib/parcels";
import { io } from "socket.io-client";
import { toast } from "sonner";

let socket;

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { findMidpoint } from "@/lib/utils";
import { findDelivery } from "@/lib/delivery";

const LeafletMap = dynamic(() => import("../../../components/leafletMap"), {
	ssr: false,
});

export default function Trackone({ params }) {
	const router = useRouter();
	const { isLoading, setIsLoading } = useAppStore();
	const [data, setData] = useState([]);
	const [status, setStatus] = useState(null);
	const [mapData, setMapData] = useState([]);
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
		trackPackage();
	}, []);

	const initializeSocketConnection = async (deliveryId) => {
		socket = io("http://localhost:5000", {
			transports: ["websocket"],
		});
		socket.emit("join-room", deliveryId, () => {
			console.log("Messenger joined room.");
		});

		socket.emit("track-delivery", params.id, deliveryId, () => {
			console.log("Track delivery");
		});

		console.log("Joined Room: ", socket);
	};

	if (socket != undefined) {
		socket.on("connect", () => {
			console.log(`${socket.id}`);
		});

		socket.on("live-location", (liveLocation) => {
            setLiveLocation(liveLocation);
		});

		socket.on("completed-delivery", (trackingId) => {
            console.log(trackingId)
            if(params.id == trackingId){
                console.log("Delivery Completed for tracking id: ", trackingId);
                if(status !=  "PACKAGE DELIVERED"){                    
                    setStatus("PACKAGE DELIVERED");
                    parcelDeliveryComplete();                    
                }
            }
		});
	}

    const parcelDeliveryComplete = async() => {
        const {resultsAlt, errorAlt} = await updateParcel([params.id], "PACKAGE DELIVERED"); 
    }

	const trackPackage = async () => {
		if (params.id != "" && params.id != null) {
			const { results, error } = await findParcel(params.id);
			if (results != null) {
				console.log("Results: ", results);
				setIsLoading(false);
				setData(results);
                setStatus(results.status);
                let mapPoints = [
					{
						lat: results.destinationGeo.lat,
						lng: results.destinationGeo.lng,
						popUpContent: "DESTINATION",
						type: "DESTINATION",
					},{
                        lat: results.sourceGeo.lat,
                        lng: results.sourceGeo.lng,
                        popUpContent: results.status,
                        type: "WAREHOUSE",
                    }
				];

				setMapData(mapPoints);
                setCentreLocation(findMidpoint(mapPoints));

                let deliveryId = results.deliveryId;
				if ( deliveryId != null) {

                    const {results, error} = await findDelivery(deliveryId);
                    setLiveLocation({
                        lat: results.route[0].path[0][0],
                        lng: results.route[0].path[0][1],
                        popUpContent: "Servicepoint " + results.warehouseId,
                        type: "LIVE LOCATION",
                    });
                    if(results.status == "ONROUTE"){
                        initializeSocketConnection(deliveryId);
                    }
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
	}

	return (
		<div className="flex flex-row flex-1 justify-between gap-10 p-10 pt-[90px] max-h-screen">
			<Card className="shadow-m w-2/6 flex flex-1 flex-col ">
				<CardHeader className="pt-5 pb-3">
					<CardDescription>PKG: #{params.id}</CardDescription>
					<Label htmlFor="destinationAddress" className="pt-3">
						Deliver To address:
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
				<CardContent className="h-full flex flex-col overflow-y-hidden pt-3">
					<div className="flex items-center gap-2 justify-between">
						<div className="flex flex-row flex-1 items-center gap-2 ">
							<Label htmlFor="packageStatus">Status:</Label>
							<div id="packageStatus">
								<div className="text-sm">
									{status != null && <>{status}</>}
								</div>
							</div>
						</div>
						<div>
							{status == "ON ROUTE" && (
								<Badge variant="destructive" className="animate-pulse">
									LIVE
								</Badge>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="flex w-4/6 shadow-m">
				<LeafletMap
					locations={mapData}
					centreLocation={centreLocation}
					mapZoom={15}
                    liveLocation={liveLocation}
				/>
			</div>
		</div>
	);
}
