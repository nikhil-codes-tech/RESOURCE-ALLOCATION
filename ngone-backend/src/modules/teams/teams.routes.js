import { Router } from 'express';
import * as teamsController from './teams.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTeamSchema, inviteSchema, respondInviteSchema, transferLeaderSchema } from './teams.schema.js';

const router = Router();

router.get('/', teamsController.listOpen);
router.get('/me', protect, teamsController.getMyTeams);
router.get('/invites/pending', protect, teamsController.getPendingInvites);
router.get('/:id', teamsController.getTeam);
router.get('/:id/members', teamsController.getMembers);

router.post('/', protect, validate(createTeamSchema), teamsController.createTeam);
router.post('/:id/join', protect, teamsController.joinTeam);
router.post('/:id/leave', protect, teamsController.leaveTeam);
router.post('/:id/invite', protect, validate(inviteSchema), teamsController.invite);

router.put('/invites/:id', protect, validate(respondInviteSchema), teamsController.respondInvite);
router.put('/:id/leader', protect, validate(transferLeaderSchema), teamsController.transferLeader);

router.delete('/:id/members/:vid', protect, teamsController.kickMember);

export default router;
