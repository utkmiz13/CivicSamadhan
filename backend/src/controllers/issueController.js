/**
 * Issue Controller
 * Orchestrates civic issue lifecycle: creation, AI triage, contractor dispatch, and citizen verification.
 */

const { dataService, getLocalStorage } = require('../config/supabase');
const { triageIssue } = require('../services/aiTriage');

const issueController = {
  /**
   * Retrieve issues with optional category and status filtering
   */
  getIssues: async (req, res) => {
    const { status, category } = req.query || {};
    let issues = await dataService.getIssues();

    if (status) {
      issues = issues.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }
    if (category) {
      issues = issues.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    return res.json({
      success: true,
      count: issues.length,
      data: issues
    });
  },

  /**
   * Citizen issue submission with automated AI triage & duplicate check
   */
  createIssue: async (req, res) => {
    const { title, description, category, location, imageUrl, reportedBy } = req.body || {};

    if (!title || !category || !location?.lat || !location?.lng) {
      return res.status(400).json({
        success: false,
        error: 'Mandatory fields missing: title, category, and valid location coordinates are required.'
      });
    }

    const currentIssues = await dataService.getIssues();
    const lat = Number(location.lat);
    const lng = Number(location.lng);

    // Run AI triage
    const triageResult = triageIssue(title, description || '', category, lat, lng, currentIssues);

    const issueId = `ISS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIssue = {
      id: issueId,
      title: title.trim(),
      description: description || 'Reported via JanSetu Citizen Portal',
      category,
      severity: triageResult.severity,
      status: 'Pending',
      location: {
        address: location.address || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      },
      reportedBy: reportedBy || {
        userId: req.user?.id || 'USR-101',
        name: req.user?.name || 'Aarav Sharma',
        phone: '+91 98765 43210'
      },
      reportedAt: new Date().toISOString(),
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
      assignedTo: null,
      resolution: null,
      aiMetadata: {
        detectedObject: triageResult.detectedObject,
        confidence: triageResult.confidence,
        hazardScore: triageResult.hazardScore,
        isDuplicate: triageResult.isDuplicate,
        duplicateId: triageResult.duplicateId,
        distanceMeters: triageResult.distanceMeters
      }
    };

    await dataService.createIssue(newIssue);

    return res.status(201).json({
      success: true,
      message: 'Issue registered and processed through AI classification.',
      pointsAwarded: 15,
      data: newIssue
    });
  },

  /**
   * Municipality assigns issue to authorized contractor
   */
  assignContractor: async (req, res) => {
    const { issueId } = req.params;
    const { contractorId, slaHours = 24 } = req.body || {};

    const contractors = await dataService.getContractors();
    const contractor = contractors.find(c => c.id === contractorId) || contractors[0];
    const deadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const updatedIssue = await dataService.updateIssue(issueId, {
      status: 'In Progress',
      assignedTo: {
        contractorId: contractor.id,
        name: contractor.name,
        assignedAt: new Date().toISOString(),
        slaHours: Number(slaHours),
        deadline
      }
    });

    if (!updatedIssue) {
      return res.status(404).json({ success: false, error: `Issue ${issueId} not found` });
    }

    return res.json({
      success: true,
      message: `Issue assigned to ${contractor.name} with ${slaHours}h SLA.`,
      data: updatedIssue
    });
  },

  /**
   * Contractor uploads field resolution proof
   */
  submitResolution: async (req, res) => {
    const { issueId } = req.params;
    const { resolvedImageUrl, notes } = req.body || {};

    const updatedIssue = await dataService.updateIssue(issueId, {
      status: 'Under Verification',
      resolution: {
        resolvedAt: new Date().toISOString(),
        resolvedImageUrl: resolvedImageUrl || 'https://images.unsplash.com/photo-1541888946425-d0fbb1861593?w=800',
        notes: notes || 'Repairs performed as per municipal road and safety standards.',
        verifiedByCitizen: false
      }
    });

    if (!updatedIssue) {
      return res.status(404).json({ success: false, error: `Issue ${issueId} not found` });
    }

    return res.json({
      success: true,
      message: 'Resolution proof submitted. Awaiting citizen confirmation.',
      data: updatedIssue
    });
  },

  /**
   * Citizen reviews and confirms resolution proof (+45 tokens awarded)
   */
  verifyResolution: async (req, res) => {
    const { issueId } = req.params;
    const { feedback, satisfied = true } = req.body || {};

    const currentIssues = await dataService.getIssues();
    const issue = currentIssues.find(i => i.id === issueId);

    if (!issue) {
      return res.status(404).json({ success: false, error: `Issue ${issueId} not found` });
    }

    const resolution = {
      ...(issue.resolution || {}),
      verifiedByCitizen: Boolean(satisfied),
      citizenFeedback: feedback || 'Verified and confirmed. Repair looks solid!',
      rewardPointsIssued: 45
    };

    const updatedIssue = await dataService.updateIssue(issueId, {
      status: 'Resolved',
      resolution
    });

    return res.json({
      success: true,
      message: 'Resolution verified by citizen. Civic reward tokens disbursed.',
      pointsAwarded: 45,
      data: updatedIssue
    });
  }
};

module.exports = issueController;
