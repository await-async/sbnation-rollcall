(function () {
    const getCommentsGuid = "c6dcbc1373d9800ab596729e7259e846";
    const apiRoot = "https://sbnation.coral.coralproject.net/api/graphql";

    /**
     * Gets the comments for the currently viewed discussion
     * @returns {Promise<Array<Comment>>}
     */
    function fetchComments() {
        const params = new URLSearchParams({
            query: "", // required to be present
            id: getCommentsGuid,
            variables: JSON.stringify({
                storyURL: window.location.href,
                flattenReplies: true
            })
        });
        const url = new URL(apiRoot);
        url.search = params.toString();

        return fetch(url, {
            mode: "cors"
        }).then((result) => result.json())
            .then((parsed) => parsed.data.story.comments);
    }

    /**
     * Flattens the comments response from fetchComments into a single array of all comments
     * @returns {Array<SimpleComment>}
     */
    function flattenComments(comments) {
        return flattenComments_rec(comments.edges);
    }

    // Recursive call for doing the actual work of flattening out the nested replies to a comment
    // into a single array
    function flattenComments_rec(comments) {
        let result = [];
        comments.forEach(comment => {
            result.push(simpleComment(comment.node));
            // Overly nested comment chains stop including the replies property at a certain point, so 
            // it needs to be checked for before also checking if it has any (via edges > 0)
            if (comment.node.replies && comment.node.replies.edges) {
                result = result.concat(flattenComments_rec(comment.node.replies.edges))
            }
        });
        return result;
    }

    /**
     * Trims down the full comment object from the API into a simple result of desired fields
     * @param {Comment} node
     * @returns {SimpleComment}
     */
    function simpleComment(node) {
        return {
            recs: node.actionCounts.reaction.total,
            author: node.author.username,
            body: node.body
        }
    }

    function commentStatistics() {
        fetchComments().then(comments => {
            const stats = {};
            comments = flattenComments(comments);
            const commenters = Object.groupBy(comments, f => f.author);
            stats.commenters = Object.entries(commenters)
                .map(entry => {
                    return {
                        author: entry[0],
                        comments: entry[1].length,
                        topComment: entry[1].reduce((best, current) => {
                            if (!best) {
                                return current;
                            }
                            else if (best.recs < current.recs) {
                                return current;
                            }
                            else {
                                return best;
                            }
                        }, null),
                        totalRecs: entry[1].reduce((accumulator, current) => accumulator += current.recs, 0)
                    }
                })
                .sort((a, b) => b.comments - a.comments) // desc
            stats.topComments = stats.commenters.reduce((max, current) => {
                if (!max) {
                    max = [current.topComment];
                }
                else if (max[0].recs === current.topComment.recs) {
                    max.push(current.topComment);
                }
                else if (max[0].recs < current.topComment.recs) {
                    max = [current.topComment];
                }
                return max;
            }, null);

            // TODO: UI work
            console.log("stats:", stats);
            return stats;
        });
    }

    // Expose functions to the window until I make an actual UI component for this
    window.fetchFlat = () => {
        fetchComments().then((comments) => {
            const flatComments = flattenComments(comments);
            console.log(flatComments);
            return flatComments;
        })
    };

    window.commentStatistics = commentStatistics;
})();