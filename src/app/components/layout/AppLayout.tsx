import React, { Component } from 'react';
import FlameLayout, { UserMenuOptions } from '../../../support/layout/components/FlameLayout';
import SubjectIcon from '@material-ui/icons/Subject';
import Container from '../../../support/ioc/Container';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Authenticator } from '../../../support/auth/Authenticator';
import { cloneWith } from '../../../support/random/utils';

const site = {
    url: 'https://opi.techmoodivns.eu',
    name: 'opi'
}

const title = "Opi";

const mainMenu = {
    items: [{
        title: 'Subjects',
        path: '/',
        icon: <SubjectIcon />
    }]
}

export interface AppLayoutProps extends RouteComponentProps {
    container: Container;
}

interface AppLayoutState {
    userMenu: UserMenuOptions
}

class AppLayout extends Component<AppLayoutProps, AppLayoutState> {

    private authenticator: Authenticator;

    constructor(props: AppLayoutProps) {
        super(props);

        let container  = props.container;
        
        this.authenticator = container.get(Authenticator);

        this.state = {
            userMenu: { 
                title: 'Guest',
                items: [[{
                    title: 'Logout',
                    onClick: () => this.logout(),
                }]]
            }
        }
    }

    componentDidMount() {
        let title = this.authenticator.session?.actor.name;
        
        this.setState({
            userMenu: cloneWith(this.state.userMenu, { title })
        })
    }

    render() {
        const { children } = this.props;
        const { userMenu } = this.state;

        return (<FlameLayout 
            mainMenu={mainMenu} 
            site={site} 
            title={title} 
            userMenu={userMenu}>{children}</FlameLayout>);
    }

    logout() {
        this.authenticator.logout();
    }
}

export default withRouter(AppLayout);
