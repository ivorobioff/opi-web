import React, { Component } from 'react';
import Typography from '@material-ui/core/Typography';
import {Link} from "@material-ui/core";

export default class Copyright extends Component<{}, {}> {
    render() {
        return (<Typography variant="body2" color="textSecondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href="https://opi.techmoodivns.eu">
                opi.techmoodivns.eu
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>)
    }
}