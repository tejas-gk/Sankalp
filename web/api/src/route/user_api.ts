import express from "express";
import { EventRegister, HackathonRegister, EventRegisterByID, HackathonRegisterByID, EventRegisterAddEvent, HackathonRegisterRemoveMembers, HackathonRegisterAddMembers, EventRegisterRemoveEvent } from "../db/sankalpUser";
import { decrypt, encrypt } from "../workers/crypt";
import { EventModels, EventModelE, EventModelS, HackathonModel } from "../workers/model";
import { qrCreator, formID } from "../workers/qrcode";
import { sendCopyMail } from "../workers/mail";

const router = express.Router();

// Registraction event
router.post("/registration/:info", async(req, res) => {
    try {
        const info = Number(req.params.info);
        if (info === 0) { // Event registration
            const datax: EventModels = req.body;
            var data: EventModelE | EventModelS;
            if (datax.student) {
                data = req.body;
            } else {
                data = req.body;
            }
            data.verify = false;
            var register = await EventRegister(data);
            if (!register.success) {
                res.status(500).json({ success: false, message: register.message })
            }
            var dt = await qrCreator(register.id);
            if (!dt.success) {
                res.status(500).json({ success: false, message: dt.message })
            }
            var rs = await sendCopyMail(`${req.protocol}://${req.hostname}`, true, data.mail, dt.id);
            if (!rs['success']===true) {
                console.log("Mailed failed");
                res.status(500).json({ success: false, message: rs.message });
            }
            data.qrId = dt.id;
            res.status(200).json({ success: true, id: register.id, dl: dt.link })
        } else { // Hackathon registration
            const data: HackathonModel = req.body;
            data.verify = false;
            var register = await HackathonRegister(data);
            if (!register.success) {
                res.status(500).json({ success: false, message: register.message })
            }
            var dt = await qrCreator(register.id);
            if (!dt.success) {
                res.status(500).json({ success: false, message: dt.message })
            }
            var rs = await sendCopyMail(`${req.protocol}://${req.hostname}`, false, data.tlEmail, dt.id);
            if (!rs.success) {
                res.status(500).json({ success: false, message: rs.message })
            }
            data.qrId = dt.id;
            res.status(200).json({ success: true, id: register.id, dl: dt.link })
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

router.get("/info/:id", async(req, res) => {
    try {
        var id = req.params.id;
        var register;
        try { // Event registration
            register = await EventRegisterByID(id);
        } catch (e) { // Hackathon registration
            register = await HackathonRegisterByID(id);
        }
        if (!register) {
            res.status(500).json({ success: false, message: 'No info on this ID.' })
        }
        res.status(200).json({ success: true, result: register })
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

// Modifier
router.patch("/modifier/:info/:id", async(req, res) => {
    try {
        const info = Number(req.params.info);
        const id = req.params.id;
        var modify;
        if (info === 0) {
            const data = req.body;
            if (data['add'] === true) { // Adds event
                modify = await EventRegisterAddEvent(id, data['events']);
            } else { // Removes events
                modify = await EventRegisterRemoveEvent(id, data['events']);
            }
            
        } else {
            const data = req.body;
            if (data['add'] === true) { // Adds member
                modify = await HackathonRegisterAddMembers(id, data['member']);
            } else { // Remove events
                modify = await HackathonRegisterRemoveMembers(id, data['email']);
            } 
        }
        if (!modify.success) {
            res.status(500).json({ success: false, message: 'No info on this data.' })
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

// Feedback
router.post("/feedback", async(req, res) => {
    try {
        
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

export const User = router