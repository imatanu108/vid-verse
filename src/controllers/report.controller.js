import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js"


const reportContent = asyncHandler(async (req, res) => {
    const { contentId } = req.params;
    const { issue } = req.body;

    if (!issue || !issue.trim()) {
        throw new ApiError(400, "Issue is required!");
    }

    if (!contentId) {
        throw new ApiError(400, "Content Id is missing.");
    }

    if (!mongoose.isValidObjectId(contentId)) {
        throw new ApiError(400, "Invalid Content Id format.");
    }

    const handleReport = async (contentType, contentId, issue) => {
        let content;
        let oldReport;
        let report;
        let reportMessage = '';
        let userId = req.user._id;

        try {
            content = await contentType.findById(contentId);

            if (content) {
                try {
                    oldReport = await Report.findOneAndUpdate(
                        {
                            [contentType.modelName.toLowerCase()]: new mongoose.Types.ObjectId(String(contentId)),
                            reportBy: new mongoose.Types.ObjectId(String(userId))
                        },
                        {
                            $set: { issue }
                        },
                        {
                            new: true
                        }
                    );
                } catch (error) {}

                if (!oldReport) {
                    report = await Report.create({
                        [contentType.modelName.toLowerCase()]: contentId,
                        reportBy: userId,
                        issue
                    });

                    if (!report) {
                        throw new ApiError(400, "Something went wrong while reporting.");
                    }
                }

                report = oldReport || report;
                reportMessage = `${contentType.modelName} is reported successfully. We will try to solve the issue as soon as possible.`;
            }
        } catch (error) {}

        return { report, reportMessage };
    };

    const { report: videoReport, reportMessage: videoReportMessage } = await handleReport(Video, contentId, issue);
    const { report: tweetReport, reportMessage: tweetReportMessage } = await handleReport(Tweet, contentId, issue);
    const { report: commentReport, reportMessage: commentReportMessage } = await handleReport(Comment, contentId, issue);

    if (!videoReport && !tweetReport && !commentReport) {
        throw new ApiError(404, "Content not found!");
    }

    const report = videoReport || tweetReport || commentReport;
    const reportMessage = videoReportMessage || tweetReportMessage || commentReportMessage;

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, 
                report, 
                reportMessage
            )
        );
});

export { reportContent }


// previous version of reportContent

// const reportContent = asyncHandler(async (req, res) => {
//     const { contentId } = req.params
//     const { issue } = req.body

//     if (!issue || !issue.trim()) {
//         throw new ApiError(400, "Issue is required!")
//     }

//     if (!contentId) {
//         throw new ApiError(400, "Content Id is missing.")
//     }

//     if (!mongoose.isValidObjectId(contentId)) {
//         throw new ApiError(400, "Invalid Content Id format.")
//     }

//     let video;
//     let tweet;
//     let comment;
//     let report;
//     let reportMessage = '';

//     try {
//         video = await Video.findById(contentId)

//         if (video) {

//             let oldReport;
//             try {
//                 oldReport = await Report.findOneAndUpdate(
//                     {
//                         video: new mongoose.Types.ObjectId(String(contentId)),
//                         reportBy: new mongoose.Types.ObjectId(String(req.user._id))
//                     },
//                     {
//                         $set: { issue }
//                     },
//                     {
//                         new: true
//                     }
//                 );
//             } catch (error) {}

//             if (!oldReport) {
//                 report = await Report.create({
//                     video: contentId,
//                     reportBy: req.user._id,
//                     issue
//                 })

//                 if (!report) {
//                     throw new ApiError(400, "Something went wrong while reporting.")
//                 }

//             }

//             report = oldReport
//             reportMessage = "Video is reported successfully. We will try to solve the issue as soon as possible."
//         }
//     } catch (error) { }

//     try {
//         tweet = await Tweet.findById(contentId)

//         if (tweet) {

//             let oldReport;
//             try {
//                 oldReport = await Report.findOneAndUpdate(
//                     {
//                         tweet: new mongoose.Types.ObjectId(String(contentId)),
//                         reportBy: new mongoose.Types.ObjectId(String(req.user._id))
//                     },
//                     {
//                         $set: { issue }
//                     },
//                     {
//                         new: true
//                     }
//                 );
//             } catch (error) {}

//             if (!oldReport) {
//                 report = await Report.create({
//                     tweet: contentId,
//                     reportBy: req.user._id,
//                     issue
//                 })

//                 if (!report) {
//                     throw new ApiError(400, "Something went wrong while reporting.")
//                 }
//             }

//             report = oldReport
//             reportMessage = "Tweet is reported successfully. We will try to solve the issue as soon as possible."
//         }
//     } catch (error) { }

//     try {
//         comment = await Comment.findById(contentId)

//         if (comment) {

//             let oldReport;
//             try {
//                 oldReport = await Report.findOneAndUpdate(
//                     {
//                         comment: new mongoose.Types.ObjectId(String(contentId)),
//                         reportBy: new mongoose.Types.ObjectId(String(req.user._id))
//                     },
//                     {
//                         $set: { issue }
//                     },
//                     {
//                         new: true
//                     }
//                 );
//             } catch (error) {}

//             if (!oldReport) {
//                 report = await Report.create({
//                     comment: contentId,
//                     reportBy: req.user._id,
//                     issue
//                 })
    
//                 if (!report) {
//                     throw new ApiError(400, "Something went wrong while reporting.")
//                 }
//             }

//             report = oldReport
//             reportMessage = "Comment is reported successfully. We will try to solve the issue as soon as possible."
//         }
//     } catch (error) { }

//     if (!video && !tweet && !comment) {
//         throw new ApiError(404, "Content not found!")
//     }

//     return res
//         .status(200)
//         .json(
//             new ApiResponse(
//                 200,
//                 report,
//                 reportMessage
//             )
//         )

// })