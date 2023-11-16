import express from "express";
import { UserRegisterByMail, UserRegistersFindUser, HackathonRegisterFindDetailsByID, UserRegisterByID, hackathonRegisterGetLeadEmail, EventRegisterFindDetailsByID, EventRegister, HackathonRegister, EventQRAdder, HackathonQRAdder } from "../db/sankalpUser";
import { EventModels, HackathonModel, Member } from "../workers/model";
import { qrCreator, formID } from "../workers/qrcode";
import { encrypt } from "workers/crypt";
import { sendCopyMail } from "../workers/mail";
import { verifyToken } from "../workers/auth";
import Mail from "nodemailer/lib/mailer";
const router = express.Router();

// --- Form ---

// Registration for talk or event or hackathon
router.post("/registration/:info", verifyToken, async(req, res) => {
    try {
        const info = req.params.info;
        const id = req.body.id;
        var data: EventModels | HackathonModel | any = req.body;
        delete data.id;
        var register;
        if (info==='e' || info==='t') { // Event & Talk registration
            register = await EventRegister(id, data);
        } else if (info==='h') { // Hackathon registrationW
            data.verify = false;
            register = await HackathonRegister(id, data);
        } else {
            res.status(500).json({ success: false, message: "Check your info params." })
            return
        }
        if (!register.success) {
            res.status(500).json({ success: false, message: register.message });
            return
        }
        var dt = await qrCreator(register?.id);
        if (!dt.success) {
            res.status(500).json({ success: false, message: dt.message })
            return
        }
        if (info==='e' || info==='t') { await EventQRAdder(register.id, dt.id) } else { await HackathonQRAdder(register.id, dt.id); }
        const qr: any =  {'e': 0, 't': 1, 'h': 2 };
        const mail = (info==='e' || info == 't')? (await UserRegisterByID(id))?.email : await hackathonRegisterGetLeadEmail(register.id);
        if (!mail) {
            res.status(500).json({ success: false, message: "Issue with fetching the Email ID." })
            return
        }
        var name;
        if (info==='h') {
            name=data.name;
        } else {
            for (const participant of data.event.participant) { 
                (participant.lead)? name=UserRegisterByMail(participant.info): {}
            }
        }
        var rs = await sendCopyMail(`${req.protocol}://${req.hostname}`, qr[info], (info==='h')? null: data.event.eve, mail, name, dt.id);
        if (!rs['success']===true) {
            console.log("Mailed failed");
            res.status(500).json({ success: false, message: rs.message });
            return
        }
        res.status(200).json({ success: true, dl: dt.link })
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
});


// Get info of talk or event or hackathon
router.get("/info/:info", verifyToken, async(req, res) => {
    try {
        var info = req.params.info;
        var register;
        try {
            if(info === 'u') { // User information
                register = await UserRegistersFindUser(req.body.id);
            } else if (info === 'et') { // Event & Talk information (Not done)
                register = await EventRegisterFindDetailsByID(req.body.event);
            } else if (info === 'h') { // Hackathon information Not done)
                register = await HackathonRegisterFindDetailsByID(req.body.hackathon);
            } else {
                res.status(500).json({ success: false, message: "Check your info params." })
                return
            }
        } catch (e) { 
            return res.status(500).json({ success: false, message: `Error: ${e}` })
        }
        if (!register) {
            res.status(500).json({ success: false, message: 'No info on this ID.' })
            return
        }
        res.status(200).json(register)
    } catch (e) {
        res.status(500).json({ success: false, message: e.message })
    }
})

// Modifier
// router.post("/modifier/:info", verifyToken, async(req, res) => {
//     try {
//         const info = Number(req.params.info);
//         var modify;
//         if (info === 0) {
//             const data = req.body;
//             if (data['add'] === true) { // Adds event
//                 modify = await EventRegisterAddEvent(req.body.id, data['events']);
//             } else { // Removes events
//                 modify = await EventRegisterRemoveEvent(req.body.id, data['events']);
//             }
//         } else if (info === 1) {
//             const data = req.body;
//             if (data['add'] === true) { // Adds event
//                 modify = await EventRegisterAddEvent(req.body.id, data['events']);
//             } else { // Removes events
//                 modify = await EventRegisterRemoveEvent(req.body.id, data['events']);
//             }
//         } else {
//             const data = req.body;
//             if (data['add'] === true) { // Adds member
//                 modify = await HackathonRegisterAddMembers(req.body.id, data['member']);
//             } else { // Remove events
//                 modify = await HackathonRegisterRemoveMembers(req.body.id, data['email']);
//             }
//         }
//         if (!modify.success) {
//             res.status(500).json({ success: false, message: 'No info on this data.' })
//         } else {
//             res.status(200).json({ success: true, message: 'Updated the details.' })
//         }
//     } catch (e) {
//         res.status(500).json({ success: false, message: e.message })
//     }
// })

export const App = router