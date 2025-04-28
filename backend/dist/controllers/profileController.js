"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileData = void 0;
/**
 * Gets the user profile data
 * @param req Express request
 * @param res Express response
 */
const getProfileData = (req, res) => {
    try {
        // Need to type-cast req to include the user property added by auth middleware
        const user = req.user;
        // Check if user exists in the request (set by auth middleware)
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        // Return the user profile data
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username || '',
                email: user.email || '',
                role: user.role || 'user',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                organization: user.organization || '',
                // Add any other profile data you want to include
            }
        });
    }
    catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile data',
            error: error.message || 'Unknown error'
        });
    }
};
exports.getProfileData = getProfileData;
//# sourceMappingURL=profileController.js.map