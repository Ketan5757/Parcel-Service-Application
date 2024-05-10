const redis = require("redis");

const client = redis.createClient();

async function storeRoomData(deliveryId, roomData) {
	try {
		if (!client.isOpen) {
			await client.connect();
		}
		const roomDataString = JSON.stringify(roomData);
		await client.hSet(deliveryId, "roomData", roomDataString);
		// console.log(`Room data stored for delivery ID: ${deliveryId}`);
	} catch (error) {
		console.error("Error storing room data in Redis:", error);
	}
}

async function retrieveRoomData(deliveryId) {
	try {
		if (!client.isOpen) {
			await client.connect();
		}
		const roomDataString = await client.hGet(deliveryId, "roomData");

		if (roomDataString !== null) {
			const roomData = JSON.parse(roomDataString); // Parse JSON back to a JS object
			return roomData;
		} else {
			console.log(`No room data found for delivery ID: ${deliveryId}`);
			return null; // Indicate no data found
		}
	} catch (error) {
		console.error("Error retrieving room data from Redis:", error);
		return null; // Indicate retrieval error
	}
}

async function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

var timerInterval = {};

module.exports = (io) => {
	io.on("connection", async (socket) => {
		socket.on("join-room", async (deliveryId, callback) => {
			socket.join(deliveryId);

			io.in(deliveryId).emit("all-updates", "New viewer joined");
			console.log(socket.id + " joined ROOM ID:" + deliveryId);
			callback({
				roomId: deliveryId,
				message: socket.id + " joined ROOM ID:" + deliveryId,
			});
		});

		socket.on("initiate-delivery", async (deliveryId, deliveryData) => {
			let roomData = await retrieveRoomData(deliveryId);

			if (!roomData) {
				roomData = {
					routeIndex: 0,
					pathIndex: 0,
					isDeliveryComplete: false,
					completedDeliveries: [],
				};
				await storeRoomData(deliveryId, roomData);
			}

			if (roomData) {
				if (true) {
					// if (roomData.routeIndex === 0 && roomData.pathIndex === 0) {// Update in Redis
					console.log("Delivery data collection");
					roomData.mainData = deliveryData;
					roomData.completedRoute = [];
					roomData.liveLocation = {
						lat: deliveryData.route[0].path[0][0],
						lng: deliveryData.route[0].path[0][1],
						popUpContent: "AT WAREHOUSE",
						type: "LIVE LOCATION",
					};
					roomData.nextStop = [];
					roomData.routeIndex = 0;
					roomData.pathIndex = 0;
					roomData.completedDeliveries = [];
					roomData.isDeliveryComplete = false;
					roomData.status = "AT WAREHOUSE";
					await storeRoomData(deliveryId, roomData); // Update in Redis
					console.log("Delivery data collected");
					io.in(deliveryId).emit("all-updates", "Delivery data collected");
				}

				if (roomData && !roomData.isDeliveryComplete) {
					console.log("Delivery routing start");
					io.in(deliveryId).emit("all-updates", "Delivery starting");
					timerInterval[deliveryId] = setInterval(async function () {
						if (
							roomData.pathIndex <=
							roomData.mainData.route[roomData.routeIndex].path.length - 2
						) {
							roomData.pathIndex += 1;
						} else {
							roomData.pathIndex = 0;
							console.log("Arrived at stop : ", roomData.routeIndex + 1);
							if (!roomData.completedDeliveries)
								roomData.completedDeliveries = [];
							roomData.completedDeliveries.push(
								roomData.mainData.route[roomData.routeIndex].trackingId
							);
							io.in(deliveryId).emit(
								"completed-delivery",
								roomData.mainData.route[roomData.routeIndex].trackingId
							);
							if (roomData.routeIndex <= roomData.mainData.route.length - 2) {
								roomData.routeIndex += 1;
								roomData.liveLocation = {
									lat: roomData.mainData.route[roomData.routeIndex].path[
										roomData.pathIndex
									][0],
									lng: roomData.mainData.route[roomData.routeIndex].path[
										roomData.pathIndex
									][1],
									popUpContent: "Making a delivery",
									type: "LIVE LOCATION",
								};
								io.in(deliveryId).emit("live-location", roomData.liveLocation);
								await delay(5000);
							} else {
								io.in(deliveryId).emit("all-updates", "Delivery completed");
								roomData.isDeliveryComplete = true; // Update in Redis
							}
						}

						if (!roomData.isDeliveryComplete) {
							roomData.liveLocation = {
								lat: roomData.mainData.route[roomData.routeIndex].path[
									roomData.pathIndex
								][0],
								lng: roomData.mainData.route[roomData.routeIndex].path[
									roomData.pathIndex
								][1],
								popUpContent:
									roomData.mainData.route.length -
									roomData.routeIndex +
									" stops away",
								type: "LIVE LOCATION",
							};
							await storeRoomData(deliveryId, roomData);
							io.in(deliveryId).emit("live-location", roomData.liveLocation);
						} else {
							roomData.liveLocation = {
								lat: roomData.mainData.route[roomData.routeIndex].path[
									roomData.mainData.route[roomData.routeIndex].path.length - 1
								][0],
								lng: roomData.mainData.route[roomData.routeIndex].path[
									roomData.mainData.route[roomData.routeIndex].path.length - 1
								][1],
								popUpContent: "All Delivery Completed",
								type: "LIVE LOCATION",
							};
							await storeRoomData(deliveryId, roomData);
							io.in(deliveryId).emit("live-location", roomData.liveLocation);
							clearInterval(timerInterval[deliveryId]);
						}
					}, 800);
				} else {
					io.in(deliveryId).emit(
						"all-updates",
						"Delivery Id missing in socket rooms."
					);
					clearInterval(timerInterval[deliveryId]);
				}
			} else {
				console.error(
					`Error: Delivery ID ${deliveryId} not found in room data.`
				);
			}
		});

		socket.on("track-delivery", async (trackingId, deliveryId) => {
			let roomData = await retrieveRoomData(String(deliveryId));
			if (roomData) {
				timerInterval[trackingId] = setInterval(async function () {
					let roomData = await retrieveRoomData(String(deliveryId));
					if (roomData) {
						io.in(deliveryId).emit("live-location", roomData.liveLocation);

						if (
							roomData.liveLocation.popUpContent === "All Delivery Completed"
						) {
							clearInterval(timerInterval[trackingId]);
						}

						if (roomData.completedDeliveries.length > 0) {
							const filteredList = roomData.completedDeliveries.filter(
								(item) => item == Number(trackingId)
							);
							console.log(filteredList);
							if (filteredList.length > 0) {
								console.log("Emitting Parcel Delivery completion status");
								io.in(deliveryId).emit("completed-delivery", trackingId);
								clearInterval(timerInterval[trackingId]);
							}
						}
					} else {
						console.error(
							`Error: Delivery ID ${deliveryId} not found in room data.`
						);
						clearInterval(timerInterval[deliveryId]);
						clearInterval(timerInterval[trackingId]);
					}
				}, 800);
			}
		});

		socket.on("resume-delivery", async (deliveryId) => {
			console.log(deliveryId);
			let roomData = await retrieveRoomData(deliveryId);
            if (roomData && !roomData.isDeliveryComplete) {
                clearInterval(timerInterval[deliveryId]);
				io.in(deliveryId).emit("all-updates", "Delivery starting");
				timerInterval[deliveryId] = setInterval(async function () {
					if (
						roomData.pathIndex <=
						roomData.mainData.route[roomData.routeIndex].path.length - 2
					) {
						roomData.pathIndex += 1;
					} else {
						roomData.pathIndex = 0;
                        console.log("Arrived at stop : ", roomData.routeIndex + 1);
                        if(!roomData.completedDeliveries) roomData.completedDeliveries = [];
                        roomData.completedDeliveries.push(roomData.mainData.route[roomData.routeIndex].trackingId);
                        io.in(deliveryId).emit("completed-delivery", roomData.mainData.route[roomData.routeIndex].trackingId);
						if (roomData.routeIndex <= roomData.mainData.route.length - 2) {
							roomData.routeIndex += 1;
							roomData.liveLocation = {
								lat: roomData.mainData.route[roomData.routeIndex].path[
									roomData.pathIndex
								][0],
								lng: roomData.mainData.route[roomData.routeIndex].path[
									roomData.pathIndex
								][1],
								popUpContent: "Making a delivery",
								type: "LIVE LOCATION",
							};
							io.in(deliveryId).emit("live-location", roomData.liveLocation);
							await delay(5000); 
						} else {
							io.in(deliveryId).emit("all-updates", "Delivery completed");
							roomData.isDeliveryComplete = true; // Update in Redis
						}
					}

					if (!roomData.isDeliveryComplete) {
						roomData.liveLocation = {
							lat: roomData.mainData.route[roomData.routeIndex].path[
								roomData.pathIndex
							][0],
							lng: roomData.mainData.route[roomData.routeIndex].path[
								roomData.pathIndex
							][1],
							popUpContent:
								roomData.mainData.route.length -
								roomData.routeIndex +
								" stops away",
							type: "LIVE LOCATION",
						};
                        await storeRoomData(deliveryId, roomData);
						io.in(deliveryId).emit("live-location", roomData.liveLocation);
					} else {
						roomData.liveLocation = {
							lat: roomData.mainData.route[roomData.routeIndex].path[
								roomData.mainData.route[roomData.routeIndex].path.length - 1
							][0],
							lng: roomData.mainData.route[roomData.routeIndex].path[
								roomData.mainData.route[roomData.routeIndex].path.length - 1
							][1],
							popUpContent: "All Delivery Completed",
							type: "LIVE LOCATION",
						};                     
                        await storeRoomData(deliveryId, roomData);
						io.in(deliveryId).emit("live-location", roomData.liveLocation);
						clearInterval(timerInterval[deliveryId]);
					}
				}, 800);
			} else {
				io.in(deliveryId).emit(
					"all-updates",
					"Delivery Id missing in socket rooms."
				);
                clearInterval(timerInterval[deliveryId]);
			}
		});

		socket.on("disconnecting", () => {
			console.log("disconnecting from : ");
			console.log(socket.rooms); // the Set contains at least the socket ID

			socket.rooms.forEach(function (roomId) {
				console.log(socket.id + " disconnecting from " + roomId);
			});
		});

		socket.on("disconnected", () => {
			console.log(socket.id + " disconnected.");
		});

		socket.on("connect_error", (err) => {
			console.log(`connect_error due to ${err.message}`);
		});
	});
};
