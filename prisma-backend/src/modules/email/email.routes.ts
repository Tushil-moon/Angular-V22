import { Router } from "express";
import { emailSequenceRouter } from "../email-sequences/email-sequence.routes";
import { emailTemplateRouter } from "../email-templates/email-template.routes";

export const emailRouter = Router();

emailRouter.use("/templates", emailTemplateRouter);
emailRouter.use("/sequences", emailSequenceRouter);
