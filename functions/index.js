const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// const https = require("https");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.newDeliveryRequest = functions.firestore
    .document("gyemame_request/{docID}")
    .onCreate((snapshot, context) => {
      const newValue = snapshot.data();
      const userID = newValue.userID;
      // const docId = context.params.docID;
      // const trackingNumber = newValue.deliveryInformation.trackingNumber;
      //    const itemType = snapshot.data["itemType"];
      //    const quantity = snapshot.data["quantity"];
      return admin.firestore().doc(`users/${userID}`).get()
          .then((sn) => {
            // const firstname = sn.data()["firstname"];
            // const lastname = sn.data()["lastname"];

            // const fcmToken = sn.get("fcmToken");
            const topic = "rider_requests";

            const message = {
              notification: {
                title: "New Request Alert",
                body: "You've recieve a new gyemame request, "+
                 "tap to find out more.",
              },
              topic: topic,
            };

            return admin.messaging().send(message)
                .then((response) => {
                  // Response is a message ID string.
                  console.log("Successfully sent message:", response);
                  // checkout for request timeouts
                  const status = newValue.status;
                  console.log(status);
                })

                .catch((error) => {
                  console.log("Error sending message:", error);
                });
          })
          .catch((error) => {
            console.log("Error retrieve firestore data:", error);
          });
    });


exports.RequestConfirmed = functions.firestore
    .document("gyemame_request/{docID}").onWrite((change, context) => {
      const newValue = change.after.data();
      const trackingNumber = newValue.deliveryInformation.trackingNumber;
      const pickuplocation = newValue.deliveryInformation.pickuplocation.name;

      if (newValue.status === "Accepted") {
        const userId = newValue.userID;

        return admin.firestore().doc(`users/${userId}`).get()
            .then((snap) => {
              const deviceToken = snap.get("fcmToken");
              const payloadd = {
                notification: {
                  title: "Pick up request accepted",
                  body: "Our rider has accepted your pick-up request " +
                   "and is on their way to " +
                  `pick up item with ID number: ${trackingNumber}` +
                  ` at ${pickuplocation}`,
                  sound: "default",
                  badge: "1",
                },
              };
              return admin.messaging().sendToDevice(deviceToken, payloadd);
            });
      } else {
        return;
      }
    });

exports.ItemPickedup = functions.firestore
    .document("gyemame_request/{docID}/trip_information/1")
    .onWrite((change, context) => {
      const newValue = change.after.data();

      if (newValue.pickup == true && newValue.dropoff == false) {
        const docId = context.params.docID;

        return admin.firestore().doc(`gyemame_request/${docId}`).get()
            .then((snap) => {
              const userID = snap.get("userID");
              const deliveryInformation = snap.data()["deliveryInformation"];
              const trackingNumber = deliveryInformation.trackingNumber;
              const pickuplocation = deliveryInformation.pickuplocation.name;

              return admin.firestore().doc(`users/${userID}`).get()
                  .then((sn)=> {
                    const fcmToken = sn.get("fcmToken");

                    const payloadd = {
                      notification: {
                        title: "Item Picked up",
                        body: "Our rider has picked up your item " +
                        `(ID: ${trackingNumber}) at ${pickuplocation} and is `+
                         "headed to the specified drop off location!",
                        sound: "default",
                        badge: "1",
                      },
                    };

                    return admin.messaging().sendToDevice(fcmToken, payloadd);
                  });
            });
      } else {
        return;
      }
    });

exports.ItemDropoff = functions.firestore
    .document("gyemame_request/{docID}/trip_information/1")
    .onWrite((change, context) => {
      const newValue = change.after.data();
      if (newValue.dropoff == true) {
        // send alert to customer that item has been picked up

        // get the doc ID
        const docId = context.params.docID;

        //  then get userID
        return admin.firestore().doc(`gyemame_request/${docId}`).get()
            .then((snap) => {
              const userID = snap.get("userID");

              const deliveryInformation = snap.data()["deliveryInformation"];
              const trackingNumber = deliveryInformation.trackingNumber;
              const dropofflocation = deliveryInformation.dropofflocation.name;

              return admin.firestore().doc(`users/${userID}`).get()
                  .then((sn)=> {
                    const fcmToken = sn.get("fcmToken");

                    const payloadd = {
                      notification: {
                        title: "Item Dropped off",
                        body: "Our rider has successfully dropped off your "+
                      `item with ID: ${trackingNumber} at ${dropofflocation}`,
                        sound: "default",
                        badge: "1",
                      },
                    };

                    return admin.messaging().sendToDevice(fcmToken, payloadd);
                  });
            });
      } else {
        return;
      }
    });
