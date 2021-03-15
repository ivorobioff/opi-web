import React, { Component } from 'react';
import {Route, Router, Switch } from 'react-router-dom';
import AppLayout from './app/components/layout/AppLayout';
import Container from './support/ioc/Container';
import { Authenticator } from './support/auth/Authenticator';
import HttpCommunicator from './support/http/HttpCommunicator';
import secretHeaderProvider from './support/auth/secretHeaderProvider';
import forbiddenErrorHandler from './support/auth/forbiddenErrorHandler';
import Environment from './support/env/Environment';
import { createMuiTheme, ThemeProvider } from '@material-ui/core';
import { orange } from '@material-ui/core/colors';
import { cloneWith } from './support/random/utils';
import { SubjectService } from './app/services/SubjectService';
import SubjectView from './app/components/page/SubjectView';
import { createBrowserHistory } from 'history';
import AuthLayout from './support/auth/components/AuthLayout';
import Login  from './support/auth/components/Login';
import PrivateRoute from './support/auth/components/PrivateRoute';

const container = new Container();

container.registerFactory('env', () => {
    return cloneWith({
        baseUrl: 'http://localhost:3001',
        apiBaseUrl: 'http://localhost:8080/api/v1.0',
    }, window.__ENV__);
});

container.registerType(SubjectService);
container.registerType(Authenticator);

container.registerFactory('history', () => createBrowserHistory());

// normal
container.registerFactory('http', container => {
    return new HttpCommunicator({ baseUrl: container.get<Environment>('env').apiBaseUrl })
});

// secured
container.registerFactory('https', container => {
    return new HttpCommunicator({
        baseUrl: container.get<Environment>('env').apiBaseUrl,
        requestOptionsProvider: secretHeaderProvider(container.get(Authenticator)),
        errorHandler: forbiddenErrorHandler(container.get(Authenticator))
    })
});

container.get(Authenticator).watch();

const theme = createMuiTheme({
    palette: {
        primary: {
            main: '#00897b',
        },
        secondary: orange,
    }
});

interface AppProps {

}

interface AppState {

}

class App extends Component<AppProps, AppState> {
    render() {
        return (<ThemeProvider theme={theme}><Router history={container.get('history')}>
            <Switch>
                <PrivateRoute container={container} exact path={['/', '/subjects']}>
                    <AppLayout container={container}>
                        <SubjectView container={container} />
                    </AppLayout>
                </PrivateRoute>
                <Route exact path="/sign-in">
                    <AuthLayout title="Sign-In">
                        <Login container={container} labels={ { usernameControl: 'Username'} } />
                    </AuthLayout>
                </Route>
            </Switch>
        </Router></ThemeProvider>)
    }
}

export default App;
