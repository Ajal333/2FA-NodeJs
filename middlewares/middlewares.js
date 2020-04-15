
const middlewareObj = {}

middlewareObj.isLoggedIn = (req,res,next) => {
    if(req.user) {
        return next();
    }
    req.flash('error', 'You need to Log-In');
    res.redirect('/login');
}

middlewareObj.hasAdminPrivs = (req,res,next) => {
    if(req.user) {
        if(req.user.isAdmin) {
            return next();
        }
    }
    req.flash('error','You need admin privilages');
    res.redirect('/login');
}

module.exports = middlewareObj;