"use client";
import { useAppStore } from "@/state/appState";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { findServicePoints } from "@/lib/dhl";

import { cn, findMidpoint } from "@/lib/utils";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { Icons } from "@/components/icons";
import { createParcel, fetchParcels, updateParcel } from "@/lib/parcels";
import { createDelivery } from "@/lib/delivery";

const LeafletMap = dynamic(() => import("../../components/leafletMap"), {
	ssr: false,
});

export default function Packing() {
	const router = useRouter();
	const { isLoading, setIsLoading } = useAppStore();
	const [error, setError] = useState(null);
	const [sourceAddressList, setSourceAddressList] = useState([]);
	const [parcelsList, setParcelsList] = useState([]);
	const [selectedParcels, setSelectedParcels] = useState([]);
	const [selectedParcelCount, setSelectedParcelCount] = useState(0);
	const [selectedSourceAddress, setSelectedSourceAddress] = useState({});
	const [mapData, setMapData] = useState([]);
	const [centreLocation, setCentreLocation] = useState({
		lat: 49.3988,
		lng: 8.6724,
	});

	useEffect(() => {
		setIsLoading(true);
		fetchPoints(20, 0, ["pobox", "postoffice", "servicepoint"]);
	}, []);

	const fetchPoints = async (limit, offset, category) => {
		const { results, error } = await findServicePoints(limit, offset, category);
		if (results != null) {
			setSourceAddressList(results);
			setIsLoading(false);
		} else {
			console.log("Error: ", error);
		}
	};

	const fetchParcelsByWarehouse = async (warehouseId, warehouseLat, warehouseLng, warehouseName) => {
		const { results, error } = await fetchParcels("", warehouseId);
		if (results != null) {
			let dataList = [{
                lat: warehouseLat,
                lng: warehouseLng,
                popUpContent: warehouseName,
                type: "WAREHOUSE"
            }];
			let temp = [];
			for (const item of results) {
				dataList.push({
					lat: item.destinationGeo.lat,
					lng: item.destinationGeo.lng,
					popUpContent: "PKG #" + item.trackingId,
					type: "DESTINATION",
				});
				temp.push(false);
			}
			setParcelsList(results);
			setSelectedParcels(temp);
			setMapData(dataList);
            setCentreLocation(findMidpoint(dataList));
			setIsLoading(false);
		} else {
			console.log("Error: ", error);
		}
	};

	const selectSourceAddress = (e) => {
		console.log(e);
		let sourceData = sourceAddressList[e.split("#")[1]];
		console.log(sourceData);
        let warehouseName = "Servicepoint: " + sourceData.url.split("/")[2];
		setSelectedSourceAddress({
			house: warehouseName,
			street: sourceData.place.address.streetAddress ?? "",
			city: sourceData.place.address.addressLocality ?? "",
			state: "",
			zipcode: sourceData.place.address.postalCode ?? "",
			country: sourceData.place.address.countryCode ?? "",
			lat: sourceData.place.geo.latitude,
			lng: sourceData.place.geo.longitude,
			warehouseId: sourceData.url,
		});

		console.log("Fetching parcels for warehouse : " + sourceData.url);
		fetchParcelsByWarehouse(sourceData.url, sourceData.place.geo.latitude, sourceData.place.geo.longitude, warehouseName );
	};

	const selectParcel = (e) => {
		console.log(e.target.id);
		let indexClicked = e.target.id.split("#")[1];
		let temp = selectedParcels;
		temp[indexClicked] = !selectedParcels[indexClicked];
        if(temp[indexClicked]){
            setSelectedParcelCount(selectedParcelCount + 1);
        }else{
            setSelectedParcelCount(selectedParcelCount - 1);
        }
		setSelectedParcels(temp);
		console.log(selectedParcels);
	};

	async function submitPackingForm(event) {
		setIsLoading(true);
		event.preventDefault();

		if (
			selectedParcels.length > 0
		) {
			const timestampInMilliseconds = new Date().getTime();
            let filteredParcels = parcelsList.filter((parcel, index) => selectedParcels[index]);
			let deliveryData = {
				deliveryId: Number(timestampInMilliseconds),
				status: "CREATED",
                parcels: filteredParcels,
                warehouseId : selectedSourceAddress.warehouseId,
                sourceGeo: { lat: selectedSourceAddress.lat, lng: selectedSourceAddress.lng}
			};

			const { results, error } = await createDelivery(deliveryData);
			const { resultsAlt, errorAlt } = await updateParcel(filteredParcels.map((item) => item.trackingId), "PACKED FOR DELIVERY", deliveryData.deliveryId);

			if (results != null && resultsAlt != null) {
				console.log("Results: ", results);
				setIsLoading(false);
				router.push("/delivery/" + deliveryData.deliveryId);
			} else {
				setError(error);
				console.log("Error: ", error);
			}
		} else {
			setError("Missing Credentials.");
		}

		setIsLoading(false);
	}

	return (
		<div className="flex flex-row flex-1 justify-between gap-10 p-10 pt-[90px] max-h-screen">
			<Card className="shadow-m w-2/6 flex flex-1 flex-col ">
				<form
					onSubmit={submitPackingForm}
					className="flex flex-col h-full justify-between"
				>
					<CardHeader>
						<CardTitle>Packing</CardTitle>
						<CardDescription>
							Select a warehouse to show parcels "Pending Delivery". Select one
							or more parcels and click on "Intiate Delivery" to start the
							delivery process.
						</CardDescription>
						<Select className="w-inherit" onValueChange={selectSourceAddress}>
							<SelectTrigger className="w-inherit">
								<SelectValue placeholder="Select source location" />
							</SelectTrigger>
							<SelectContent className="w-[300px]">
								{sourceAddressList != null && (
									<div className="flex flex-wrap gap-2 md:pt-5 justify-center">
										{sourceAddressList.map((item, index) => (
											<SelectItem key={index} value={`source#${index}`}>
												<div className="text-md font-bold">
													{item.place.address.streetAddress}
												</div>
												<div>
													{item.place.address.addressLocality},{" "}
													{item.place.address.countryCode},{" "}
													{item.place.address.postalCode}
												</div>
											</SelectItem>
										))}
									</div>
								)}
							</SelectContent>
						</Select>
					</CardHeader>
					<CardContent className="h-full overflow-y-scroll">
						<Label htmlFor="parcelList">Parcels pending delivery: (Selected : {selectedParcelCount})</Label>
						<div id="parcelList" className="flex flex-wrap pt-3 space-y-2">
							{parcelsList.length > 0 ? (
								parcelsList.map((item, index) => (
									<div
										key={index}
										className="flex flex-row gap-3 items-center justify-between w-full"
									>
										<div>
											<Checkbox
												id={`checkbox#${index}`}
												checked={selectedParcels[index]}
												onClick={selectParcel}
											/>
										</div>
										<div className="flex flex-1 flex-col w-full">
											<div className="text-md font-bold">{item.trackingId}</div>
											<div className="text-sm">
												{item.destinationAddress.houseName},{" "}
												{item.destinationAddress.street}
											</div>
											<div className="text-sm">
												{item.destinationAddress.city},{" "}
												{item.destinationAddress.state},{" "}
												{item.destinationAddress.country}
											</div>
											<div className="text-sm">
												{item.destinationAddress.zipcode}
											</div>
										</div>
									</div>
								))
							) : (
								<div>No parcels found.</div>
							)}
						</div>
					</CardContent>
					<CardFooter className="flex justify-between py-3">
						<div className="grid w-full items-center">
							<button className={cn(buttonVariants())} disabled={isLoading}>
								{isLoading && (
									<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
								)}
								Plan Delivery
							</button>
							{error != "" && (
								<p className="px-1 text-xs text-red-600 justify-center text-center">
									{error}
								</p>
							)}
						</div>
					</CardFooter>
				</form>
			</Card>
			<div className="flex w-4/6 shadow-m">
				<LeafletMap
					locations={mapData}
					centreLocation={centreLocation}
					mapZoom={15}
				/>
			</div>
		</div>
	);
}
