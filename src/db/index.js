import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGOBD_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB Connected !  DB Host:${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("Error To Connect DataBase....", error);
    process.exit(1);
  }
};
export default connectDB;
